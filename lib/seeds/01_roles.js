'use strict';

exports.seed = async function(knex) {
  const rolesToSeed = [
    {
      id: 1,
      name: 'admin',
      description: 'Usuario con acceso total al sistema',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  for (const role of rolesToSeed) {
    const existingRole = await knex('roles')
      .where('id', role.id)
      .orWhere('name', role.name)
      .first();
    
    if (!existingRole) {
      await knex('roles').insert(role);
      console.log(`Rol "${role.name}" insertado con éxito.`);
    } else {
      await knex('roles')
        .where('id', role.id)
        .update({
          description: role.description,
          updated_at: new Date()
        });
      console.log(`Rol "${role.name}" ya existe, descripción actualizada.`);
    }
  }
};