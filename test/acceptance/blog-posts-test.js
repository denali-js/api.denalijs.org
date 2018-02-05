import { appAcceptanceTest } from 'denali';

const test = appAcceptanceTest();

test('POST /blog-posts > creates a blog post', async (t) => {
  let result = await t.context.app.post('/blog-posts', {
    // Add the blog post payload here
  });

  t.is(result.status, 201);
  // t.is(result.body.foo, 'bar');
});

test('GET /blog-posts > should list blog posts', async (t) => {
  let result = await t.context.app.get('/blog-posts');

  t.is(result.status, 200);
  // t.is(result.body.foo, 'bar');
});

test('GET /blog-posts/:id > should show a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    // Add the blog post payload here
  });
  let id = body.data.id;

  let result = await t.context.app.get(`/blog-posts/${ id }`);

  t.is(result.status, 200);
  // t.is(result.body.foo, 'bar');
});

test('PATCH /blog-posts/:id > should update a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    // Add the blog post payload here
  });
  let id = body.data.id;

  let result = await t.context.app.patch(`/blog-posts/${ id }`, {
    // Add the blog post payload here
  });

  t.is(result.status, 200);
  // t.is(result.body.foo, 'bar');
});

test('DELETE /blog-posts/:id > should delete a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    // Add the blog post payload here
  });
  let id = body.data.id;

  let result = await t.context.app.delete(`/blog-posts/${ id }`);

  t.is(result.status, 204);
});
