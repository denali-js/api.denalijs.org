import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post';

export default class ListBlogPosts extends ApplicationAction {

  async respond() {
    return await BlogPost.query();
  }

}
