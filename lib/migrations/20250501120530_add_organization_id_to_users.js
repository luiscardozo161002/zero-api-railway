'use strict';

exports.up = async (knex) => {
  await knex.schema.table('users', (table) => {
    // Add organization_id column
    table.integer('organization_id').unsigned().references('id').inTable('organizations')
      .onDelete('CASCADE') // When organization is deleted, delete its users
      .after('role_id'); // Add after role_id column
    
    // Create index for faster queries
    table.index('organization_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('users', (table) => {
    // Drop index first
    table.dropIndex('organization_id');
    
    // Drop foreign key and column
    table.dropColumn('organization_id');
  });
};