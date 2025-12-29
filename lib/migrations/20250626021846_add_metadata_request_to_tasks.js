'use strict';

exports.up = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.json('metadata_request');
    table.dropColumn('document_request_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('metadata_request');
    table.string('document_request_id', 100).nullable();
  });
};
