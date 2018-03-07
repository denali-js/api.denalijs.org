import { inspect } from 'util';
import assert from 'assert';
import { Errors } from '@denali-js/core';
import ApplicationAction from '../application';
import Version from '../../models/version';
import VersionAlias from '../../models/version-alias';

export default class ShowVersion extends ApplicationAction {

  async respond({ query }: { query: { addon: string, version: string} }) {
    assert(query.addon, `You must include which addon to fetch: ${ inspect(query) }`);
    assert(query.version, `You must include which version to fetch: ${ inspect(query) }`);
    let version = await Version.queryOne({ addon_id: query.addon, version: query.version });
    if (!version) {
      let versionAlias = await VersionAlias.queryOne({ alias: query.version, addon_id: query.addon });
      if (!versionAlias) {
        throw new Errors.NotFound(`Version not found (addon: "${ query.addon }", version: "${ query.version }")`);
      }
      version = await versionAlias.getVersion();
    }
    console.log(version);
    return version;
  }

}
