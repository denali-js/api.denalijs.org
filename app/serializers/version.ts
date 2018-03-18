import ApplicationSerializer from './application';

export default class VersionSerializer extends ApplicationSerializer {

  attributes = ApplicationSerializer.ALL_ATTRIBUTES;

  relationships = {};

}
