'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: User } = require('../../models/user');
const { resourceGone } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/users/{user}',
  options: {
    tags: ['api', 'users'],
    description: 'Retrieve user information',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'support', 'user:{params.user}']
    },
    response: {
      status: {
        200: User.append({
          id: Joi.string().uuid().required()
        })
          .options({ stripUnknown: true })
          .label('User'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        404: Helpers.HTTP_404,
        410: Helpers.HTTP_410
      }
    },
    validate: {
      params: Joi.object({
        user: Joi.string().uuid().required()
      }),
      query: Joi.object({
        showDeleted: Joi.boolean().default(false)
      })
    },
    handler: async (request, h) => {
      const { usersService } = request.services();
      const { showDeleted } = request.query;
      
      const result = await usersService.findOne(
        request.params.user,
        showDeleted
      );
      
      return h.response(result).code(200);
    }
  }
});