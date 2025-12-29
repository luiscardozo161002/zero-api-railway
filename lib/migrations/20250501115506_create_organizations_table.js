'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('organizations', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('subdomain', 50).unique().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.boolean('is_active').defaultTo(true);
    
    // Indexes
    table.index('subdomain');
    table.index(['is_active', 'deleted_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('organizations');
};