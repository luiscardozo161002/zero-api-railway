'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

exports.seed = async (knex) => {
  // Verificar organización app
  const organization = await knex('organizations')
    .where('subdomain', 'app')
    .first();

  if (!organization) {
    console.log('Cannot create users: Default organization not found.');
    return;
  }

  /* ============================================================
     1) CREAR USUARIO TEST (ivan@zeroclm.com)
  ============================================================ */
  const testEmail = 'ivan@zeroclm.com';
  let testUser = await knex('users').where('email', testEmail).first();

  if (!testUser) {
    const password_hash = await bcrypt.hash('Pass#Dev2024', 10);

    await knex('users').insert({
      id: uuidv4(),
      username: 'devcervant',
      full_name: 'Iván Sánchez Cervantes',
      role_id: 1,
      organization_id: organization.id,
      email: testEmail,
      password_hash,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('Test user created successfully');
  } else {
    console.log('Test user already exists');
  }

  /* ============================================================
     2) CREAR USUARIO ADMIN (admin@mail.com)
  ============================================================ */
  const adminEmail = 'admin@mail.com';
  let adminUser = await knex('users').where('email', adminEmail).first();

  if (!adminUser) {
    const adminPassword = await bcrypt.hash('Adm1n1str@d0r', 10);

    await knex('users').insert({
      id: uuidv4(),
      username: 'admin',
      full_name: 'Administrator',
      role_id: 1, // IMPORTANTE: debe existir role_id = 1 para admin
      organization_id: organization.id,
      email: adminEmail,
      password_hash: adminPassword,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('Admin user created successfully');
  } else {
    console.log('Admin user already exists');
  }
};
