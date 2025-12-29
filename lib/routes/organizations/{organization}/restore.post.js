'use strict';

const Helpers = require('../../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

const notes = `Restore a soft-deleted organization`;

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/organizations/{id}/restore',
  options: {
    tags: ['api', 'organizations'],
    description: 'Restore deleted organization',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      params: Joi.object({
        id: Joi.number().integer().required().description('Organization ID')
      })
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
        const { organizationsService } = request.services();
        
        const restoredOrganization = await organizationsService.restore(id);
        
        return restoredOrganization;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});