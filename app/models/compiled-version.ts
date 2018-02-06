import { attr } from 'denali';
import ApplicationModel from './application';

export default class CompiledVersion extends ApplicationModel {

  static get schema() {
    return Object.assign(super.schema, {
      packageName: attr('string'),
      version: attr('string')
    });
  }

}
