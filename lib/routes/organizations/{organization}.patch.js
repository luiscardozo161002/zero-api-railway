'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Update an existing organization`;

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/organizations/{id}',
  options: {
    tags: ['api', 'organizations'],
    description: 'Update organization',
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
      payload: Joi.object({
        name: Joi.string().max(100).optional().example('Company ABC Updated').description('Organization name'),
        subdomain: Joi.string().max(50).pattern(/^[a-z0-9-]+$/).lowercase().optional().example('abc-updated').description('Organization subdomain')
      }).options({ stripUnknown: true }).min(1)
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
        400: Helpers.HTTP_400,
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { payload } = request;
        const { organizationsService } = request.services();
        
        // Validate subdomain format if provided
        if (payload.subdomain && !/^[a-z0-9-]+$/.test(payload.subdomain)) {
          throw badRequest('Subdomain can only contain lowercase letters, numbers, and hyphens');
        }
        
        // Update organization
        const updatedOrganization = await organizationsService.update(id, payload);
        
        return updatedOrganization;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});