'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('notification_templates', (table) => {
    table.increments('id').primary();
    table.string('template_name', 100).notNullable();
    table.string('notification_type', 50).notNullable(); // 'document', 'request', 'task'
    table.text('subject_template').notNullable();
    table.text('body_template').notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('notification_templates');
};
