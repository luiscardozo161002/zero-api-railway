'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('notification_logs', (table) => {
    table.increments('id').primary();
    table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.string('status', 20).notNullable();
    table.text('error_message').nullable();
    table.json('recipients').nullable(); // Lista de destinatarios a quienes se envió
    table.text('subject').nullable();
    table.text('body').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('notification_logs');
};
