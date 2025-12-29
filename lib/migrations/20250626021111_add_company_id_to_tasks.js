'use strict';

exports.up = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.integer('company_id').unsigned().references('id').inTable('companies').onDelete('SET NULL');
    table.index('company_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('company_id');
  });
};
