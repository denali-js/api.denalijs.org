import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('compiled_versions', (compiledVersion) => {
    compiledVersion.increments('id');
    compiledVersion.text('name');
    compiledVersion.text('version');
    compiledVersion.timestamps();
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('compiled_versions');
}
