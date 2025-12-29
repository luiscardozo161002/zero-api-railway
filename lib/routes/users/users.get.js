'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: User } = require('../../models/user');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/users',
  options: {
    tags: ['api', 'users'],
    description: 'Get all users with pagination and filters',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required'
    },
    response: {
      status: {
        200: Joi.object({
          data: Joi.array().items(User).label('Users'),
          meta: Joi.object({
            total: Joi.number().integer().required(),
            page: Joi.number().integer().required(),
            limit: Joi.number().integer().required(),
            pages: Joi.number().integer().required()
          }).label('Pagination')
        }).label('UsersResponse'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        email: Joi.string().email().optional(),
        full_name: Joi.string().optional(),
        phone: Joi.string().optional(),
        area: Joi.string().optional(),
        role_id: Joi.number().integer().optional(),
        area_id: Joi.number().integer().optional(),
        showDeleted: Joi.boolean().default(false)
      }).label('UsersQuery')
    },
    handler: async (request, h) => {
      const { usersService } = request.services();
      const { showDeleted, ...query } = request.query;
      
      const result = await usersService.findAll(query, showDeleted);
      return h.response(result).code(200);
    }
  }
});