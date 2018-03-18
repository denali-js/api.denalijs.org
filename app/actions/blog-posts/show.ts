import ApplicationAction from '../application';
import BlogPost from '../../models/blog-post';

export default class ShowBlogPost extends ApplicationAction {

  async respond({ params }: { params: { id: string | number } }) {
    return BlogPost.query().findById(params.id);
  }

}
