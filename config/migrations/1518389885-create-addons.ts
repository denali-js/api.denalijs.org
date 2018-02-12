import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('addons', (addons) => {
    addons.text('name').primary();
    addons.text('description');
    addons.text('repo_slug');
    addons.enum('docs_version_granularity', [ 'major', 'minor', 'patch' ]);
    addons.timestamps();
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('addons');
}
