'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('logs', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').notNullable().references('id').inTable('organizations');
    table.string('level', 20).notNullable().comment("'info', 'warning', 'error', etc.");
    table.text('message').notNullable();
    table.string('source', 100).comment("Componente de la aplicación");
    table.string('user_id').comment("Referencia a usuario que realizó la acción");
    table.string('ip_address', 50);
    table.jsonb('request_data').comment("Detalles de la solicitud en formato JSON");
    table.text('stack_trace');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index(['organization_id', 'level']);
    table.index(['organization_id', 'created_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('logs');
};