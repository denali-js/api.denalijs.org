import { lookup, Logger } from '@denali-js/core';
import ApplicationModel from './application';
import Version from './version';
import Addon from './addon';

const logger = lookup<Logger>('app:logger');

export default class VersionAlias extends ApplicationModel {

  static relationMappings = {
    addon: {
      relation: ApplicationModel.BelongsToOneRelation,
      modelClass: `${ __dirname }/addon`,
      join: {
        from: 'versionAlias.addonId',
        to: 'addon.name'
      }
    },
    version: {
      relation: ApplicationModel.BelongsToOneRelation,
      modelClass: `${ __dirname }/version`,
      join: {
        from: 'versionAlias.versionId',
        to: 'version.id'
      }
    }
  };

  static async createOrUpdate(aliasName: string, versionName: string, addon: Addon) {
    let version = await Version.query().findOne({ version: versionName, addon_id: addon.id });
    if (!version) {
      logger.warn(`Unable to create a version alias from ${ aliasName } -> ${ versionName }: "${ versionName }" version does not exist`);
      return;
    }
    let alias: VersionAlias;
    let existingAlias = await VersionAlias.query().findOne({ alias: aliasName, addon_id: addon.id });
    if (!existingAlias) {
      alias = await VersionAlias.query().insert({ alias: aliasName });
    } else {
      alias = existingAlias;
      await VersionAlias.query().patchAndFetchById(alias.id, { alias: aliasName });
    }
    await alias.$setRelated('version', version)
               .$setRelated('addon', addon);
  }

  alias: string;
  version: Version;
  addon: Addon;

}
