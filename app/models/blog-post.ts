import { attr } from 'denali';
import ApplicationModel from './application';

export default class BlogPost extends ApplicationModel {

  static get schema() {
    return Object.assign(super.schema, {
      title: attr('string'),
      body: attr('string')
    });
  }

}
