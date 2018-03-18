import { Errors } from '@denali-js/core';
import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post';

export default class DestroyBlogPost extends ApplicationAction {

  async respond({ params }: { params: { id: string | number } }) {
    let blogPost = await BlogPost.query().findById(params.id);
    if (!blogPost) {
      throw new Errors.NotFound();
    }
    await BlogPost.query().deleteById(blogPost.id);
    this.render(204);
  }

}
