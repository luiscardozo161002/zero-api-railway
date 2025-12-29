'use strict';

const Schmervice = require('@hapipal/schmervice');
const { unauthorized, forbidden } = require('@hapi/boom');

module.exports = class AuthService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  basic({ email, password, ipAddress, userAgent }) {
    const { User, Role } = this.server.models();
    const { cryptoService } = this.server.services();

    let userId;
    let roleId;
    let roleName;

    return User.query()
      .findOne({ email })
      .select('id', 'email', 'role_id', 'password_hash', 'is_active', 'organization_id')
      .throwIfNotFound()
      .then(({ is_active, role_id, ...user }) => {
        userId = user.id;
        //userId = userId;
        roleId = role_id;

        if (!is_active) {
          throw forbidden();
        }

        return { ...user, role_id };
      })
      .then(({ password_hash, ...user }) => {
        return cryptoService.compare(password, password_hash).then((match) => {
          if (!match) {
            throw unauthorized();
          }

          return user;
        });
      })
      .then((user) => {
        return Role.query()
          .findById(roleId)
          .select('name')
          .then((role) => {
            roleName = role?.name?.toLowerCase() || 'user';

            const jwt = cryptoService.jwt({
              email,
              sub: user.id,
              organization_id: user.organization_id,
              scope: [roleName]
            });

            const refreshToken = cryptoService.jwt({
              email,
              sub: user.id,
              organization_id: user.organization_id,
              scope: ['refresh'],
              expiresIn: '7d'
            });

            // Manejar la sesión

            return { jwt, refreshToken, user };
          });
      })
      .catch((err) => {
        console.error('💥 Error en el proceso de autenticación:', err);
        throw err;
      });
  }

  async isAvailableUserEmail({ email, id }) {
    const { User } = this.server.models();
    const user = await User.query().findOne({ email });

    // si ya existe un user con {email} y es otro usuario distinto del que quiere tener ese email
    if (user && Number(user.id) !== Number(id)) {
      return false;
    }

    return true;
  }
};
