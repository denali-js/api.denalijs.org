import * as path from 'path';
import { Service, lookup, Logger, ConfigService } from 'denali';
import moment = require('moment');
import { QueryBuilder } from 'knex';
import * as semver from 'semver';
import fetch from 'node-fetch';
import { differenceWith, flip, intersectionWith } from 'lodash';
import { dirSync as tmp } from 'tmp';
import { extract } from 'tar';
import { Extracter, ExtractedDocs } from '@denali-js/documenter';
import Addon from '../models/addon';
import Version from '../models/version';
import FilesService from '../services/files';

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

interface DocsConfig {
  pagesDir: string;
  sourceDirs: string[];
  granularity: 'major' | 'minor' | 'patch';
}

export default class RepoPollerService extends Service {

  logger = lookup<Logger>('app:logger');
  config = lookup<ConfigService>('service:config');
  files = lookup<FilesService>('service:files');

  constructor() {
    super();
    this.start();
  }

  private start() {
    this.checkNextAddon();
  }

  private async checkNextAddon() {
    this.logger.info(`Polling for next addon`);
    let addon = await this.getLeastRecentlyCheckedAddon();
    if (!addon) {
      // If we boot up faster than the registry-follower on a fresh DB, there
      // won't be any addons in the DB yet. So wait a sec.
      return setTimeout(this.checkNextAddon.bind(this), 1000);
    }
    this.logger.info(`"${ addon.name }" is the most stale addon, checking for any Github updates to release branches`);

    // Get the list of branches currently in the Github repo
    let branches = await this.getBranches(addon);
    // Get the list of Versions that track a branch (not ones created by a published version)
    let branchVersions = await this.getBranchVersions(addon);

    let comparator = (branch: Branch, version: Version) => version.branchName === branch.name;

    let branchVersionsToDelete = differenceWith<Version, Branch>(branchVersions, branches, <any>flip(comparator));
    for (let version of branchVersionsToDelete) {
      await this.deleteBranchVersion(addon, version);
    }

    let branchVersionsToCreate = differenceWith(branches, branchVersions, comparator);
    for (let branch of branchVersionsToCreate) {
      await this.createBranchVersion(addon, branch);
    }

    let branchVersionsToUpdate = intersectionWith(branches, branchVersions, comparator);
    for (let branch of branchVersionsToUpdate) {
      let branchVersion = branchVersions.find((branchVersion) => comparator(branch, branchVersion));
      await this.updateBranchVersion(addon, branchVersion, branch);
    }

    this.scheduleNextCheck();
  }

  private async getLeastRecentlyCheckedAddon() {
    return await Addon.queryOne((Addon: QueryBuilder) =>
      Addon.orderBy('compiled_at').limit(1)
    );
  }

  private async getBranches(addon: Addon): Promise<Branch[]> {
    let req = await fetch(`https://api.github.com/repos/${ addon.repoSlug }/branches`, { headers: this.githubHeaders() });
    let allBranches = <Branch[]>await req.json();
    let versionBranches = allBranches.filter((branch) => semver.valid(branch.name) || branch.name === 'master');
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

  private async createBranchVersion(addon: Addon, branch: Branch): Promise<void> {
    this.logger.info(`${ addon.name } has created version branch ${ branch.name } on Github since our last check; creating a Version to track it`);
    let branchVersion = await Version.createBranchVersion(addon, branch);
    await this.updateDocsFromBranch(addon, branchVersion, branch);
  }

  private async updateBranchVersion(addon: Addon, branchVersion: Version, branch: Branch): Promise<void> {
    if (branchVersion.lastSeenCommit !== branch.commit.sha) {
      this.logger.info(`${ addon.name } has updated branch ${ branch.name } on Github since our last check`);
      await this.updateDocsFromBranch(addon, branchVersion, branch);
    } else {
      this.logger.info(`${ addon.name }'s "${ branch.name }" branch has no change since our last check, skipping`);
    }
  }

  private async updateDocsFromBranch(addon: Addon, branchVersion: Version, branch: Branch) {
    this.logger.info(`Compiling docs for ${ addon.name }'s ${ branchVersion.version } branch`);
    let dir = await this.downloadBranch(addon.repoSlug, branchVersion.branchName);
    let config = this.loadDocsConfig(dir);
    if (branchVersion.branchName === 'master') {
      this.logger.info(`Updating ${ addon.name }'s docs config from it's master branch`);
      addon.docsVersionGranularity = config.granularity;
      await addon.save();
    }
    let docs = await this.buildDocs(addon, branchVersion.branchName, dir, config);
    await this.saveDocs(addon, branchVersion, docs);

    branchVersion.lastSeenCommit = branch.commit.sha;
    branchVersion.compiledAt = new Date();
    await branchVersion.save();
  }

  private async downloadBranch(repoSlug: string, branchName: string) {
    let tmpdir = tmp({ unsafeCleanup: true }).name;
    this.logger.info(`Downloading "${ branchName }" branch from ${ repoSlug } into ${ tmpdir }`);
    let extractStream = extract({ cwd: tmpdir });
    let tarballURL = `https://github.com/${ repoSlug }/archive/${ branchName }.tar.gz`;
    let tarballRequest = await fetch(tarballURL);
    tarballRequest.body.pipe(extractStream);
    await new Promise((resolve) => tarballRequest.body.on('end', resolve));
    return tmpdir;
  }

  private async buildDocs(addon: Addon, version: string, dir: string, config: DocsConfig) {
    this.logger.info(`Extracting documentation for ${ addon.name }@${ version } from ${ dir }`);
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
    let config: DocsConfig = {
      pagesDir: 'docs',
      sourceDirs: [ 'app', 'lib' ],
      granularity: 'minor'
    };
    try {
      this.logger.info(`Trying to load docs config from ${ dir }`);
      config = Object.assign(config, require(path.join(dir, 'config', 'docs.json')));
    } catch (e) {
      this.logger.info(`No docs config found in ${ dir }, falling back to defaults`);
    }
    return config;
  }

  private async saveDocs(addon: Addon, branchVersion: Version, docs: ExtractedDocs) {
    this.logger.info(`Uploading docs for ${ addon.name } branch "${ branchVersion.branchName }"`);
    let filepath = `${ addon.name }/branch-${ branchVersion.branchName }/docs.json`;
    branchVersion.docsUrl = await this.files.save('denali-docs', filepath, JSON.stringify(docs));
    await branchVersion.save();
  }

  private async scheduleNextCheck() {
    let { limit, remaining, resetsAt } = await this.checkRateLimit();
    let limitBuffer = limit * 0.2;
    let safeRequestsRemaining = remaining - limitBuffer;
    let timeLeft = resetsAt - moment().unix();
    let safeInterval = timeLeft / safeRequestsRemaining;
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
