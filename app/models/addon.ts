import { attr, hasMany } from 'denali';
import ApplicationModel from './application';
import { DocsConfig, PackageMetadata } from '../types';
import Version from './version';

export const DEFAULT_DOCS_CONFIG: DocsConfig = {
  pagesDir: 'docs',
  sourceDirs: [ 'app', 'lib' ],
  granularity: 'minor',
  versionStrategy: 'branches-over-tags',
  semverBranches: true,
  branches: [
    { branchName: 'master', displayName: 'master' }
  ]
};

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
  /**
   * How granular should the docs UI show the version list?
   */
  docsGranularity: DocsConfig['granularity'];
  docsVersionStrategy: DocsConfig['versionStrategy'];
  docsSemverBranches: boolean;
  getVersions: (query: any) => Version[];
  addVersion: (version: Version) => Promise<void>;

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
    await this.save();
    return config;
  }

}
