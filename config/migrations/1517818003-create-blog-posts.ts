import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('blog_posts', (post) => {
    post.increments('id');
    post.text('title');
    post.text('body');
    post.timestamps();
  });
}

export async function down(knex: any) {
  return knex.schema.dropTable('blog_posts');
}
