import { Model } from 'objection';

export default class BlogPost extends Model {

  static tableName = 'blog_posts';

  id: number;
  title: string;
  body: string;

}
