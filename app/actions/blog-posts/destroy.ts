import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post'

export default class DestroyBlogPost extends ApplicationAction {

  async respond({ params }: { params: { id: string | number } }) {
    let blogPost = await BlogPost.find(params.id);
    await blogPost.destroy();
    this.render(204);
  }

}
