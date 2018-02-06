import ApplicationSerializer from './application';

export default class BlogPostSerializer extends ApplicationSerializer {

  attributes = [
    'title',
    'body'
  ];

  relationships = {};

}
