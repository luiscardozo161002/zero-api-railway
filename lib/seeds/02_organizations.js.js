'use strict';

exports.seed = async (knex) => {
  // Check if the default organization already exists
  const existingOrg = await knex('organizations').where('subdomain', 'app').first();
  
  if (!existingOrg) {
    // Insert default organization
    const [organization] = await knex('organizations').insert({
      name: 'Zero CLM',
      subdomain: 'app',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    console.log(`Default organization created successfully with ID: ${organization.id}`);
    return organization.id;
  }

  console.log(`Default organization already exists with ID: ${existingOrg.id}`);
  return existingOrg.id;
};