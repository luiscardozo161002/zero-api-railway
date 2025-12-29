'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/auth/login',
  options: {
    auth: false,
    plugins: {
      'hapi-swagger': {
        security: []
      }
    },
    tags: ['api', 'auth'],
    description: 'Login con credenciales y genera cookie HttpOnly',
    validate: {
      payload: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      })
    },
    handler: async (request, h) => {
      const { email, password } = request.payload;

      try {
        const { authService } = request.services();

        const { jwt, user } = await authService.basic({
          email: email.toLowerCase(),
          password,
          ipAddress: request.info.remoteAddress,
          userAgent: request.headers['user-agent']
        });

        if (!jwt || !user) {
          throw Boom.unauthorized('Invalid credentials');
        }

        const response = h.response({
          ok: true,
          token: jwt,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id
          }
        });

        return response.code(200);
      } catch (error) {
        console.error('❌ Error in login handler:', error);

        if (error.isBoom) {
          return error;
        }

        throw Boom.unauthorized('Invalid credentials');
      }
    }
  }
});
