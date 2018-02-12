import ApplicationSerializer from './application';
import Addon from '../models/addon';

export default class AddonSerializer extends ApplicationSerializer {

  attributes = Object.keys(Addon.attributes);

  relationships = {};

}
