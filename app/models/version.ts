import ApplicationModel from './application';
import Addon from './addon';
import { VersionMetadata, BranchConfig, GithubBranchData } from '../types';
import VersionAlias from './version-alias';

export default class Version extends ApplicationModel {

  static relationMappings = {
    addon: {
      relation: ApplicationModel.BelongsToOneRelation,
      modelClass: `${ __dirname }/addon`,
      join: {
        from: 'version.addonId',
        to: 'addon.name'
      }
    },
    versionAliases: {
      relation: ApplicationModel.HasManyRelation,
      modelClass: `${ __dirname }/version-alias`,
      join: {
        from: 'version.id',
        to: 'versionAlias.versionId'
      }
    }
  };

  static async createBranchVersion(addon: Addon, config: BranchConfig | undefined, branch: GithubBranchData): Promise<Version> {
    let version = await Version.query().insert({
      version: branch.name,
      displayName: config && config.branchName || branch.name,
      isBranch: true,
      branchName: branch.name,
      lastSeenCommit: branch.commit.sha
    });
    await addon.$appendRelated('versions', version);
    return version;
  }

  static async createFromVersionMetadata(addon: Addon, metadata: VersionMetadata): Promise<Version> {
    let version = await Version.query().insert({
      version: metadata.version,
      tarballUrl: metadata.dist.tarball
    });
    await addon.$appendRelated('versions', version);
    return version;
  }

  version: string;
  displayName: string;
  compiledAt: Date;
  docsUrl: string;

  isBranch: boolean;
  branchName: string;
  lastSeenCommit: string;

  tarballUrl: string;

  addon: Addon;
  versionAliases: VersionAlias[];

}
