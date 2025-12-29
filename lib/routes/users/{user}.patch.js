'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { patchSchema: UserPatch, publicSchema: User } = require('../../models/user');
const { internal, notFound } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/users/{user}',
  options: {
    tags: ['api', 'users'],
    description: 'Update user information',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user:{params.user}']
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('User updated successfully'),
          data: User.options({ stripUnknown: true })
        }).label('Updated'),
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
      }),
      payload: UserPatch.append({
        password: Joi.string().optional().example('new-secure-password'),
        email: Joi.string().email().optional().example('new-email@example.com'),
        full_name: Joi.string().optional().example('John Updated Doe'),
        phone: Joi.string().optional().example('0987654321'),
        area: Joi.string().optional().example('IT Department'),
        area_id: Joi.number().integer().optional().example(2),
        role_id: Joi.number().integer().optional().example(2)
      })
        .options({ allowUnknown: false })
        .required()
    },
    handler: async (request, h) => {
      try {
        const { user: userId } = request.params;
        const { payload } = request;
        
        const { usersService } = request.services();
        
        const updatedUser = await usersService.update(userId, payload);
        
        return h.response({
          statusCode: 200,
          message: 'User updated successfully',
          data: updatedUser
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