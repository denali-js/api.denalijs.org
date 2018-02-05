import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post'

export default class UpdateBlogPost extends ApplicationAction {

  async respond({ params, body }: { params: { id: string | number }, body: any }) {
    let blogPost = await BlogPost.find(params.id);
    Object.assign(blogPost, body);
    return await blogPost.save();
  }

}
