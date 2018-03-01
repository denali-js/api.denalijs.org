import { attr, hasOne, lookup, Logger } from '@denali-js/core';
import ApplicationModel from './application';
import Version from './version';
import Addon from './addon';

const logger = lookup<Logger>('app:logger');

export default class VersionAlias extends ApplicationModel {


  static get schema() {
    return Object.assign(super.schema, {
      alias: attr('string'),
      version: hasOne('version')
    });
  }

  static async createOrUpdate(aliasName: string, versionName: string, addon: Addon) {
    let version = await Version.queryOne({ version: versionName, addon_id: addon.id });
    if (!version) {
      logger.warn(`Unable to create a version alias from ${ aliasName } -> ${ versionName }: "${ versionName }" version does not exist`);
      return;
    }
    let versionAlias = await this.queryOne({ alias: aliasName, version_id: version.id });
    if (!versionAlias) {
      versionAlias = await this.create({ alias: aliasName });
    } else {
      versionAlias.alias = aliasName;
    }
    await versionAlias.setVersion(version);
    await versionAlias.setAddon(addon);
    await versionAlias.save();
  }

  alias: string;
  getVersion: () => Version;
  setVersion: (version: Version) => void;
  getAddon: () => Addon;
  setAddon: (addon: Addon) => void;

}
