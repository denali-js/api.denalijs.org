import * as path from 'path';
import { readdirSync as readdir } from 'fs';
import assert from 'assert';
import { inspect } from 'util';
import { Service, lookup, ConfigService } from '@denali-js/core';
import moment = require('moment');
import { QueryBuilder } from 'knex';
import * as semver from 'semver';
import fetch from 'node-fetch';
import { differenceWith, flip, intersectionWith } from 'lodash';
import { Extracter, ExtractedDocs } from '@denali-js/documenter';
import Addon, { DEFAULT_DOCS_CONFIG } from '../models/addon';
import Version from '../models/version';
import FilesService from '../services/files';
import { DocsConfig, GithubBranchData, BranchConfig } from '../types';
import downloadTarball from '../utils/download-tarball';
import ApplicationLogger from '../logger';

export default class RepoPollerService extends Service {

  logger = lookup<ApplicationLogger>('app:logger').scope('repository-poller');
  config = lookup<ConfigService>('service:config');
  files = lookup<FilesService>('service:files');

  start() {
    this.checkNextAddon();
  }

  private async checkNextAddon() {
    this.logger.info(`Polling for next addon`);
    let addon = await this.getLeastRecentlyCheckedAddon();
    if (!addon) {
      // If we boot up faster than the registry-follower on a fresh DB, there
      // won't be any addons in the DB yet. So wait a sec.
      this.logger.info('No addons found - must be the first run. Delaying poller ...');
      return setTimeout(this.checkNextAddon.bind(this), 2000);
    }
    this.logger.info(`"${ addon.name }" is the most stale addon, checking for any Github updates to release branches`);

    this.logger.info(`Updating ${addon.name}'s docs config from it's master branch`);
    let config = await addon.fetchAndUpdateDocsConfig();

    // Get the list of branches currently in the Github repo
    let branches = await this.getBranches(addon, config);
    // Get the list of Versions that track a branch (not ones created by a published version)
    let branchVersions = await this.getBranchVersions(addon);

    let comparator = (branch: GithubBranchData, version: Version) => version.branchName === branch.name;

    let branchVersionsToDelete = differenceWith<Version, GithubBranchData>(branchVersions, branches, <any>flip(comparator));
    for (let version of branchVersionsToDelete) {
      await this.deleteBranchVersion(addon, version);
    }

    let branchVersionsToCreate = differenceWith(branches, branchVersions, comparator);
    for (let branch of branchVersionsToCreate) {
      let branchConfig = config.branches.find((c) => c.branchName === branch.name);
      await this.createBranchVersion(addon, branchConfig, branch);
    }

    let branchVersionsToUpdate = intersectionWith(branches, branchVersions, comparator);
    for (let branch of branchVersionsToUpdate) {
      let branchVersion = <Version>branchVersions.find((branchVersion) => comparator(branch, branchVersion));
      await this.updateBranchVersion(addon, branchVersion, branch);
    }

    this.scheduleNextCheck();
  }

  private async getLeastRecentlyCheckedAddon() {
    return await Addon.queryOne(async (objection: QueryBuilder) => {
      return objection.whereNotNull('repo_slug').orderBy('updated_at').limit(1);
    });
  }

  private async getBranches(addon: Addon, config: DocsConfig): Promise<GithubBranchData[]> {
    let req = await fetch(`https://api.github.com/repos/${ addon.repoSlug }/branches`, { headers: this.githubHeaders() });
    let allBranches = <GithubBranchData[]>await req.json();
    assert(Array.isArray(allBranches), `Expected to get an array of branches back from Github for ${ addon }, got ${ inspect(allBranches) } instead`);
    let versionBranches = allBranches.filter((branch) => {
      return semver.valid(branch.name) || config.branches.find((c) => c.branchName === branch.name);
    });
    this.logger.info(`${ addon.name } has ${ versionBranches.length } version branches`);
    return versionBranches;
  }

  private async getBranchVersions(addon: Addon): Promise<Version[]> {
    return await addon.getVersions({ is_branch: true });
  }

  private async deleteBranchVersion(addon: Addon, branchVersion: Version): Promise<void> {
    this.logger.info(`${ addon.name } has deleted it's ${ branchVersion.branchName } on Github, deleting our corresponding branch Version`);
    await branchVersion.delete();
  }

  private async createBranchVersion(addon: Addon, config: BranchConfig | undefined, branch: GithubBranchData): Promise<void> {
    this.logger.info(`${ addon.name } has created version branch ${ branch.name } on Github since our last check; creating a Version to track it`);
    let branchVersion = await Version.createBranchVersion(addon, config, branch);
    await this.updateDocsFromBranch(addon, branchVersion, branch);
  }

  private async updateBranchVersion(addon: Addon, branchVersion: Version, branch: GithubBranchData): Promise<void> {
    if (branchVersion.lastSeenCommit !== branch.commit.sha) {
      this.logger.info(`${ addon.name } has updated branch ${ branch.name } on Github since our last check`);
      await this.updateDocsFromBranch(addon, branchVersion, branch);
    } else {
      this.logger.info(`${ addon.name }'s "${ branch.name }" branch has no change since our last check, skipping`);
    }
  }

  private async updateDocsFromBranch(addon: Addon, branchVersion: Version, branch: GithubBranchData) {
    this.logger.info(`Compiling docs for ${ addon.name }'s ${ branchVersion.version } branch`);
    let tarballURL = `https://github.com/${ addon.repoSlug }/archive/${ branchVersion.branchName }.tar.gz`;
    let dir = await downloadTarball(tarballURL);
    let extractedFolder = readdir(dir)[0];
    dir = path.join(dir, extractedFolder);
    try {
      let docs = await this.buildDocs(addon, branchVersion.branchName, dir);
      await this.saveDocs(addon, branchVersion, docs);
    } catch (e) {
      // nothing for now
      // TODO: log it out or warn somehow
    }
    this.logger.info(branchVersion)
    this.logger.info(branchVersion.docsUrl)
    branchVersion.lastSeenCommit = branch.commit.sha;
    branchVersion.compiledAt = new Date();
    await branchVersion.save();
  }

  private async buildDocs(addon: Addon, version: string, dir: string) {
    this.logger.info(`Extracting documentation for ${ addon.name }@${ version } from ${ dir }`);
    let config = this.loadDocsConfig(dir);
    let extracter = new Extracter({
      dir,
      pagesDir: config.pagesDir,
      sourceDirs: config.sourceDirs,
      projectName: addon.name,
      projectVersion: version
    });
    return extracter.extract();
  }

  private loadDocsConfig(dir: string): DocsConfig {
    let config: DocsConfig;
    try {
      this.logger.info(`Trying to load docs config from ${ dir }`);
      config = Object.assign({}, DEFAULT_DOCS_CONFIG, require(path.join(dir, 'config', 'docs.json')));
    } catch (e) {
      this.logger.info(`No docs config found in ${ dir }, falling back to defaults`);
      config = DEFAULT_DOCS_CONFIG;
    }
    return config;
  }

  private async saveDocs(addon: Addon, branchVersion: Version, docs: ExtractedDocs) {
    this.logger.info(`Uploading docs for ${ addon.name } branch "${ branchVersion.branchName }"`);
    let filepath = `${ addon.name }/branch-${ branchVersion.branchName }/docs.json`;
    branchVersion.docsUrl = await this.files.save('denali-docs', filepath, JSON.stringify(docs));
  }

  private async scheduleNextCheck() {
    let { limit, remaining, resetsAt } = await this.checkRateLimit();
    let limitBuffer = limit * 0.2;
    let safeRequestsRemaining = remaining - limitBuffer;
    let timeLeft = resetsAt - moment().unix();
    let minimumInterval = this.config.get('environment') === 'production' ? 2 : 20;
    let safeInterval = Math.max(minimumInterval, timeLeft / safeRequestsRemaining);
    this.logger.info(`${ timeLeft }s left in rate limit window, ${ safeRequestsRemaining } requests available; scheduling next update for ${ safeInterval.toFixed(3) }s from now`);
    setTimeout(this.checkNextAddon.bind(this), safeInterval * 1000);
  }

  private async checkRateLimit() {
    let req = await fetch('https://api.github.com/rate_limit', { headers: this.githubHeaders() });
    let rateLimitInfo = await req.json();
    return {
      limit: <number>rateLimitInfo.resources.core.limit,
      remaining: <number>rateLimitInfo.resources.core.remaining,
      resetsAt: <number>rateLimitInfo.resources.core.reset
    };
  }

  private githubHeaders() {
    return {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${ this.config.get('githubToken') }`
    };
  }

}
