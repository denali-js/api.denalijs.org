import { attr, hasMany } from 'denali';
import ApplicationModel from './application';
import { PackageMetadata } from '../types';
import Version from './version';

export default class Addon extends ApplicationModel {

  static idColumn = 'name';

  static get schema() {
    return Object.assign(super.schema, {
      name: attr('string'),
      description: attr('string'),
      repoSlug: attr('string'),
      // 'major', 'minor', 'patch'
      docsVersionGranularity: attr('string'),
      versions: hasMany('version')
    });
  }

  static createFromPackageMetadata(pkg: PackageMetadata): Promise<Addon> {
    let latestVersionName = pkg['dist-tags'].latest;
    let latestVersion = pkg.versions[latestVersionName];
    let repository = latestVersion.repository;
    let repoSlug: string;
    if (typeof repository === 'string') {
      if (repository.startsWith('github:')) {
        repoSlug = repository.slice('github:'.length);
      } else if (!repository.split('/')[0].includes(':')) {
        repoSlug = repository;
      }
    } else if (repository && (repository.type === 'git' || repository.type == null)) {
      repoSlug = repository.url.match(/github.com\/([^\/]+\/[^\/]+?)(?:\.git)?$/)[1];
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
  docsVersionGranularity: 'major' | 'minor' | 'patch';
  getVersions: (query: any) => Version[];
  addVersion: (version: Version) => Promise<void>;

}
