import { Router } from '@denali-js/core';

export default function drawRoutes(router: Router) {

  router.resource('blog-post', { related: false });
  router.get('versions/:id', 'versions/show');

}
