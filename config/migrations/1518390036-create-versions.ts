import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('versions', (versions) => {
    versions.increments();
    versions.text('version');
    versions.dateTime('compiled_at');
    versions.text('docs_url');
    versions.text('addon_id').references('addons.name');
    versions.boolean('is_branch').defaultTo(false);
    versions.text('branch_name');
    versions.text('last_seen_commit');
    versions.text('tarball_url');
    versions.timestamps();
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('versions');
}
