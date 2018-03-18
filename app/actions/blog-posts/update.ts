import { Errors } from '@denali-js/core';
import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post';

export default class UpdateBlogPost extends ApplicationAction {

  async respond({ params, body }: { params: { id: string | number }, body: any }) {
    let blogPost = await BlogPost.query().findById(params.id);
    if (!blogPost) {
      throw new Errors.NotFound();
    }
    return await BlogPost.query().updateAndFetchById(params.id, body);
  }

}
