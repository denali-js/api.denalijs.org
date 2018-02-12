import { attr, hasOne } from 'denali';
import ApplicationModel from './application';
import Addon from './addon';
import { Branch } from '../services/repository-poller';
import { VersionMetadata } from 'app/types';

export default class Version extends ApplicationModel {

  static get schema() {
    return Object.assign(super.schema, {
      version: attr('string'),
      compiledAt: attr('date'),
      docsUrl: attr('string'),
      addon: hasOne('addon'),
      // Branch versions, i.e. versions that track a Github branch
      isBranch: attr('boolean'),
      branchName: attr('string'),
      lastSeenCommit: attr('string'),
      // Published versions, i.e. versions representing a published tarball on
      // the npm registry
      tarballUrl: attr('string')
    });
  }

  static async createBranchVersion(addon: Addon, branch: Branch): Promise<Version> {
    let version = await this.create({
      version: branch.name,
      isBranch: true,
      branchName: branch.name,
      lastSeenCommit: branch.commit.sha
    });
    await addon.addVersion(version);
    return version;
  }

  static async createFromVersionMetadata(addon: Addon, metadata: VersionMetadata): Promise<Version> {
    let version = await this.create({
      version: metadata.version,
      tarballUrl: metadata.dist.tarball
    });
    await addon.addVersion(version);
    return version;
  }

  version: string;
  compiledAt: Date;
  docsUrl: string;
  getAddon: () => Addon;

  isBranch: boolean;
  branchName: string;
  lastSeenCommit: string;

  tarballUrl: string;

}
