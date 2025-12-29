'use strict';

const Helpers = require('../../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

const notes = `Activate or deactivate an organization`;

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/organizations/{id}/toggle-active',
  options: {
    tags: ['api', 'organizations'],
    description: 'Toggle organization active status',
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
        is_active: Joi.boolean().required().example(true).description('Active status')
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
        const { is_active } = request.payload;
        const { organizationsService } = request.services();
        
        const updatedOrganization = await organizationsService.toggleActive(id, is_active);
        
        return updatedOrganization;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});