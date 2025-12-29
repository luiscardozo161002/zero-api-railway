'use strict';

exports.up = async (knex) => {
  await knex.schema.table('organizations', (table) => {
    table.integer('logo_id').unsigned().references('id').inTable('assets').onDelete('SET NULL');
    table.index('logo_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('organizations', (table) => {
    table.dropColumn('logo_id');
  });
};
