import ApplicationSerializer from './application';
import Version from '../models/version';

export default class VersionSerializer extends ApplicationSerializer {

  attributes = Object.keys(Version.attributes);

  relationships = {};

}
