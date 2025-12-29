'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.enum('type', ['logo', 'avatar']).notNullable();
    table.binary('data').notNullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['type']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('assets');
};
