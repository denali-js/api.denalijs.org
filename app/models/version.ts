import { attr, hasOne } from '@denali-js/core';
import ApplicationModel from './application';
import Addon from './addon';
import { VersionMetadata, BranchConfig, GithubBranchData } from '../types';

export default class Version extends ApplicationModel {

  static get schema() {
    return Object.assign(super.schema, {
      version: attr('string'),
      displayName: attr('string'),
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

  static async createBranchVersion(addon: Addon, config: BranchConfig | undefined, branch: GithubBranchData): Promise<Version> {
    let version = await this.create({
      version: branch.name,
      displayName: config && config.branchName || branch.name,
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
  displayName: string;
  compiledAt: Date;
  docsUrl: string;
  getAddon: () => Addon;

  isBranch: boolean;
  branchName: string;
  lastSeenCommit: string;

  tarballUrl: string;

}
