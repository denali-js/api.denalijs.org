import { attr } from '@denali-js/core';
import ApplicationModel from './application';

export default class BlogPost extends ApplicationModel {

  static get schema() {
    return Object.assign(super.schema, {
      title: attr('string'),
      body: attr('string')
    });
  }

}
