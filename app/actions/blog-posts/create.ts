import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post'

export default class CreateBlogPost extends ApplicationAction {

  async respond({ body }: any) {
    let blogPost = await BlogPost.create(body);
    this.render(201, blogPost);
  }

}
