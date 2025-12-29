'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

const notes = `Get organization details by ID`;

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/organizations/{id}',
  options: {
    tags: ['api', 'organizations'],
    description: 'Get organization by ID',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      params: Joi.object({
        id: Joi.number().integer().required().description('Organization ID')
      }),
      query: Joi.object({
        includeDeleted: Joi.boolean().optional().default(false).description('Include if organization is soft deleted')
      }).options({ stripUnknown: true })
    },
    response: {
      status: {
        200: Joi.object({
          id: Joi.number().integer().required(),
          name: Joi.string().required(),
          subdomain: Joi.string().required(),
          is_active: Joi.boolean().required(),
          created_at: Joi.date().required(),
          updated_at: Joi.date().required(),
          deleted_at: Joi.date().allow(null)
        }).options({ stripUnknown: true }),
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { includeDeleted } = request.query;
        const { organizationsService } = request.services();
        
        const organization = await organizationsService.findById(id, includeDeleted);
        
        return organization;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});