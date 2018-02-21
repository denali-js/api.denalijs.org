import assert from 'assert';
import { Errors } from 'denali';
import ApplicationAction from '../application';
import Version from '../../models/version';

export default class ShowVersion extends ApplicationAction {

  async respond({ params }: { params: { id: string } }) {
    let [ addon_id, version_id ] = params.id.split(':');
    assert(version_id, 'You must include which version to fetch, i.e. denali:0.1.0');
    let version = await Version.queryOne({ addon_id, version: version_id });
    if (!version) {
      throw new Errors.NotFound(`Version not found (addon: "${ addon_id }", version: "${ version_id }"`);
    }
    return version;
  }

}
