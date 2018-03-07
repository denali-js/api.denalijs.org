import * as Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.table('version_aliases', (versionAliases) => {
    versionAliases.unique([ 'alias', 'addon_id' ]);
  });
}

export async function down(knex: Knex) {
  return knex.schema.table('version_aliases', (versionAliases) => {
    versionAliases.dropUnique([ 'alias', 'addon_id' ]);
  });
}
