import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('version_aliases', (versionAliases) => {
    versionAliases.increments();
    versionAliases.text('alias');
    versionAliases.bigInteger('version_id').unsigned().index().references('versions.id');
    versionAliases.text('addon_id').index().references('addons.name');
    versionAliases.timestamps();
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('version_aliases');
}
