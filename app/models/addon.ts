import { lookup, Logger, attr, hasMany } from '@denali-js/core';
import fetchPackage from 'package-json';
import semver from 'semver';
import ApplicationModel from './application';
import { DocsConfig, PackageMetadata, VersionStrategies, Granularities } from '../types';
import Version from './version';
import VersionAlias from './version-alias';

export const DEFAULT_DOCS_CONFIG: DocsConfig = {
  pagesDir: 'docs',
  sourceDirs: [ 'app', 'lib' ],
  granularity: Granularities.MINOR,
  versionStrategy: VersionStrategies.BRANCHES_OVER_TAGS,
  semverBranches: true,
  branches: [
    { branchName: 'master', displayName: 'master' }
  ]
};

const logger = lookup<Logger>('app:logger');

export default class Addon extends ApplicationModel {

  static idColumn = 'name';

  static get schema() {
    return Object.assign(super.schema, {
      name: attr('string'),
      description: attr('string'),
      repoSlug: attr('string'),
      docsVersionGranularity: attr('string'),
      docsVersionStrategy: attr('string'),
      docsSemverBranches: attr('boolean'),
      versions: hasMany('version')
    });
  }

  static createFromPackageMetadata(pkg: PackageMetadata): Promise<Addon> {
    let latestVersionName = pkg['dist-tags'].latest;
    let latestVersion = pkg.versions[latestVersionName];
    let repository = latestVersion.repository;
    let repoSlug: string | null = null;
    if (typeof repository === 'string') {
      if (repository.startsWith('github:')) {
        repoSlug = repository.slice('github:'.length);
      } else if (!repository.split('/')[0].includes(':')) {
        repoSlug = repository;
      }
    } else if (repository && (repository.type === 'git' || repository.type == null)) {
      let match = repository.url.match(/github.com\/([^\/]+\/[^\/]+?)(?:\.git)?$/);
      repoSlug = match && match[1];
    }
    return this.create({
      name: pkg.name,
      description: pkg.description,
      repoSlug
    });
  }

  name: string;
  description: string;
  repoSlug: string;

  // Docs config
  docsGranularity: DocsConfig['granularity'];
  docsVersionStrategy: DocsConfig['versionStrategy'];
  docsSemverBranches: boolean;

  getVersions: (query: any) => Version[];
  addVersion: (version: Version) => Promise<void>;

  /**
   * Fetch config/docs.json for this addon from it's master branch on Github,
   * and update our local copies of the various config values. Returns the
   * fetched config.
   */
  async fetchAndUpdateDocsConfig(): Promise<DocsConfig> {
    let config: DocsConfig;
    try {
      let req = await fetch(`https://raw.githubusercontent.com/${ this.repoSlug }/master/config/docs.json`);
      let rawConfig: Partial<DocsConfig> = await req.json();
      config = Object.assign({}, DEFAULT_DOCS_CONFIG, rawConfig);
    } catch (e) {
      config = Object.assign({}, DEFAULT_DOCS_CONFIG);
    }

    this.docsGranularity = config.granularity;
    this.docsVersionStrategy = config.versionStrategy;
    this.docsSemverBranches = config.semverBranches;

    config.branches.forEach(({ branchName, displayName }) => {
      if (displayName) {
        VersionAlias.createOrUpdate(displayName, branchName, this);
      }
      // TODO: create branch versions here if they don't already exist
    });

    await this.save();
    return config;
  }

  /**
   * `latest` is a special alias, which is determined by this app. Basically,
   * to determine which version is `latest`, pick the first rule that applies:
   *
   * 1. If the addon's doc config explicitly marks a branch as latest, use
   *    that.
   * 2. If the version published on npm under the `latest` dist-tag is subsumed
   *    by a semver-named branch, use that branch.
   * 3. If the docs config specifies `branches-over-tags` as it's versioning
   *    strategy, and no semver-named branch subsumes the version published under
   *    npm's `latest` dist-tag, and we have a github repo reference for this
   *    addon, then use master.
   * 3. The version published on npm under the `latest` dist-tag.
   *
   */
  async updateLatestAlias(config?: DocsConfig) {
    logger.info(`Updating 'latest' alias for ${ this.name }`);
    if (!config) {
      config = await this.fetchAndUpdateDocsConfig();
    }

    // (1) Explicit config takes precedence over everything
    let latestBranch = config.branches.find((b) => Boolean(b.latest));
    if (latestBranch) {
      logger.info(`${ this.name } 'latest' is explicity configured to point to ${ latestBranch.branchName }`);
      await VersionAlias.createOrUpdate('latest', latestBranch.branchName, this);
      return;
    }

    // Fetch the 'latest' dist-tag from npm
    let pkg: PackageMetadata = await fetchPackage(this.name, { fullMetadata: true, allVersions: true });
    let latestDistTag = pkg['dist-tags'].latest;
    if (!latestDistTag) {
      logger.warn(`${ this.name } addon package doesn't have a 'latest' dist tag on npm, not sure how to pick a 'latest' version`);
      return;
    }

    // (2) A semver-named branch exists which satisfies the currently published
    // 'latest' dist-tag version
    let allVersions = await Version.query({ addon_id: this.id });
    let branchMatchingLatestDistTag = allVersions.find((v) => semver.satisfies(latestDistTag, v.branchName));
    if (branchMatchingLatestDistTag) {
      logger.info(`${ this.name } 'latest' will point to ${ branchMatchingLatestDistTag.branchName } branch on Github because that branch satisfies the current 'latest' dist-tag on npm`);
      await VersionAlias.createOrUpdate('latest', branchMatchingLatestDistTag.branchName, this);
      return;
    }

    // (3) `branches-over-tags` with no branch to satisfy npm's 'latest', and a
    // valid github reference, falls back to master
    if (this.repoSlug && config.versionStrategy === VersionStrategies.BRANCHES_OVER_TAGS) {
      logger.info(`${ this.name } 'latest' will point to master branch on Github because no semver branch currently satisfies the 'latest' dist-tag on npm`);
      await VersionAlias.createOrUpdate('latest', 'master', this);
      return;
    }

    // (4) Final fallback: use npm's latest version exactly
    if (allVersions.find((v) => v.version === latestDistTag)) {
      logger.info(`${ this.name } 'latest' will point to ${ latestDistTag } version published on npm, because no other approach worked`);
      await VersionAlias.createOrUpdate('latest', latestDistTag, this);
      return;
    }

    logger.error(`Trying to pick a latest version for ${ this.name }, but all strategies failed.`);
  }

}
