import { inspect } from 'util';
import assert from 'assert';
import { Errors } from '@denali-js/core';
import ApplicationAction from '../application';
import Version from '../../models/version';

export default class ShowVersion extends ApplicationAction {

  async respond({ query }: { query: { addon: string, version: string} }) {
    assert(query.addon, `You must include which addon to fetch: ${ inspect(query) }`);
    assert(query.version, `You must include which version to fetch: ${ inspect(query) }`);
    let version = await Version.queryOne({ addon_id: query.addon, version: query.version });
    if (!version) {
      throw new Errors.NotFound(`Version not found (addon: "${ query.addon }", version: "${ query.version }")`);
    }
    return version;
  }

}
