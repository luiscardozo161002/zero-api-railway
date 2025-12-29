'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.date('end_date').nullable();
    table.string('number_period', 50).nullable();
    table.string('select_period', 50).defaultTo('dias');
    table.time('actity_time').defaultTo('09:00');
    table.date('notification_date').notNullable();
    table.text('userManager').notNullable(); // Lista de usuarios (formato JSON)
    table.string('document_request_id', 100).nullable();
    table.string('status', 20).defaultTo('created');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('start_date').defaultTo(knex.fn.now());
    table.string('notification_type', 50).notNullable(); // 'document', 'request', 'task'
    table.string('notification_type_id', 100).nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('tasks');
};
