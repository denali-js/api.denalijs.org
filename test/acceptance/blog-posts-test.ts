import { setupAcceptanceTest } from 'denali';
import setupApp from '../helpers/setup-app';

const test = setupAcceptanceTest();

setupApp(test);

test('POST /blog-posts > creates a blog post', async (t) => {
  let result = await t.context.app.post('/blog-posts', {
    data: {
      attributes: {
        title: 'Hello world',
        body: 'First blog post!'
      }
    }
  });
  t.is(result.status, 201);
  t.truthy(result.body.data.attributes);
  t.is(result.body.data.attributes.title, 'Hello world');
});

test('GET /blog-posts > should list blog posts', async (t) => {
  let result = await t.context.app.get('/blog-posts');

  t.is(result.status, 200);
  t.true(Array.isArray(result.body.data));
  t.is(result.body.data.length, 0);
});

test('GET /blog-posts/:id > should show a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    data: {
      attributes: {
        title: 'Hello world',
        body: 'First blog post!'
      }
    }
  });
  let id = body.data.id;

  let result = await t.context.app.get(`/blog-posts/${ id }`);

  t.is(result.status, 200);
  t.is(result.body.data.id, id);
});

test('PATCH /blog-posts/:id > should update a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    data: {
      attributes: {
        title: 'Hello world',
        body: 'First blog post!'
      }
    }
  });
  let id = body.data.id;

  let result = await t.context.app.patch(`/blog-posts/${ id }`, {
    data: {
      attributes: {
        body: 'Second blog post!'
      }
    }
  });

  t.is(result.status, 200);
  t.is(result.body.data.attributes.body, 'Second blog post!');
});

test('DELETE /blog-posts/:id > should delete a blog post', async (t) => {
  let { body } = await t.context.app.post('/blog-posts', {
    data: {
      attributes: {
        title: 'Hello world',
        body: 'First blog post!'
      }
    }
  });
  let id = body.data.id;

  let result = await t.context.app.delete(`/blog-posts/${ id }`);

  t.is(result.status, 204);
});
