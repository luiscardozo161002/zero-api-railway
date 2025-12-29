'use strict';

exports.up = async (knex) => {
  await knex.schema.createTable('companies', (table) => {
    table.increments('id').primary();

    table.string('tradename').notNullable();
    table.string('fiscal_name_company').notNullable();
    table.string('tax_ref').notNullable();
    table.string('legal_representative');
    table.string('comp_legal_representative_last_name');
    table.string('comp_legal_representative_last_name2');
    table.string('email_legal_representative');
    table.string('fiscal_address');
    table.string('act_number');
    table.string('email_notifications');
    table.timestamp('date_act_number');
    table.string('notary_name');
    table.string('notary_last_name');
    table.string('notary_last_name2');
    table.string('authorized_notaries');
    table.string('notary_city');
    table.string('notary_state');
    table.string('acronym');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('date_letters');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.integer('organization_id').unsigned().references('id').inTable('organizations').onDelete('CASCADE');

    table.index('organization_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('companies');
};
