import { Router } from 'denali';

export default function drawRoutes(router: Router) {

  router.resource('blog-post', { related: false });

}
