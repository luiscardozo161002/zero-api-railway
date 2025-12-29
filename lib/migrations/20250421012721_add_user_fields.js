'use strict';

exports.up = async (knex) => {
  await knex.raw('ALTER TABLE users ALTER COLUMN id DROP DEFAULT');
  
  await knex.schema.table('users', (table) => {
    table.string('phone', 20).nullable();
    table.string('area', 255).nullable();
    table.integer('area_id').unsigned().nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('users', (table) => {
    table.dropColumn('phone');
    table.dropColumn('area');
    table.dropColumn('area_id');
  });
  
  await knex.raw('ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()');
};