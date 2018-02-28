import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('addons', (addons) => {
    addons.text('name').primary();
    addons.text('description');
    addons.text('repo_slug');
    addons.enum('docs_granularity', [ 'major', 'minor', 'patch' ]);
    addons.text('docs_version_strategy');
    addons.boolean('docs_semver_branches').defaultTo(false);
    addons.timestamps();
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('addons');
}
