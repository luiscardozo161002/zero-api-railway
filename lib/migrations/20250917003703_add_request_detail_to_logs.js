'use strict';

exports.up = async (knex) => {
  await knex.schema.table('logs', (table) => {
    table.jsonb('request_detail').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('logs', (table) => {
    table.dropColumn('request_detail');
  });
};