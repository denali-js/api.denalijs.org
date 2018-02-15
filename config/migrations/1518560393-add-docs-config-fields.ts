import Knex from 'knex';

export async function up(knex: Knex) {
  await knex.schema.table('versions', (version) => {
    version.text('display_name');
  });
  await knex.schema.table('addons', (addon) => {
    addon.renameColumn('docs_version_granularity', 'docs_granularity');
    addon.text('docs_version_strategy');
    addon.boolean('docs_semver_branches').defaultTo(false);
  });
}

export async function down(knex: Knex) {
  await knex.schema.table('versions', (version) => {
    version.dropColumn('display_name');
  });
  await knex.schema.table('addons', (addon) => {
    addon.renameColumn('docs_granularity', 'docs_version_granularity');
    addon.dropColumn('docs_version_strategy');
    addon.dropColumn('docs_semver_branches');
  });
}
