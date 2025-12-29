'use strict';

const Helpers = require('../../helpers');
const Joi = require('joi');
const { publicSchema: User } = require('../../../models/user');
const { internal, notFound } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/users/{user}/desactivate',
  options: {
    tags: ['api', 'users'],
    description: 'Deactivate a user (soft delete)',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff']
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('User desactivated successfully'),
          data: User.options({ stripUnknown: true })
        }).label('Desactivated'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      params: Joi.object({
        user: Joi.string().uuid().required()
      })
    },
    handler: async (request, h) => {
      try {
        const { user: userId } = request.params;
        const { usersService } = request.services();
        
        const deactivatedUser = await usersService.deactivate(userId);
        
        return h.response({
          statusCode: 200,
          message: 'User deactivated successfully',
          data: deactivatedUser
        }).code(200);
      } catch (error) {
        if (error.output?.statusCode === 404) {
          throw notFound('User not found');
        }
    
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});