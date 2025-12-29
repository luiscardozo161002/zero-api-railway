'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { internal, notFound } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'DELETE',
  path: '/users/{user}',
  options: {
    tags: ['api', 'users'],
    description: 'Permanently delete a user',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin']
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('User deleted successfully')
        }).label('Deleted'),
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
        
        await usersService.delete(userId);
        
        return h.response({
          statusCode: 200,
          message: 'User deleted successfully'
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