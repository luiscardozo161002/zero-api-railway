'use strict';

exports.up = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.uuid('request_id');
    table.index('request_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('request_id');
  });
};
