import { attr } from 'denali';
import ApplicationModel from './application';

export default class BlogPost extends ApplicationModel {

  static schema = {
    title: attr('string'),
    body: attr('string')
  };

}
