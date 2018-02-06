import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('registry_changes', (registryChanges) => {
    registryChanges.increments('id');
    registryChanges.text('last_handled_sequence');
    registryChanges.timestamps();
  });
}

export async function down(knex: any) {
  return knex.schema.dropTable('registry_changes');
}
