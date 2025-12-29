'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

const notes = `Soft-delete an organization`;

module.exports = Helpers.withDefaults({
  method: 'DELETE',
  path: '/organizations/{id}',
  options: {
    tags: ['api', 'organizations'],
    description: 'Delete organization (soft)',
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
        204: Joi.any().description('No Content'),
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { organizationsService } = request.services();
        
        await organizationsService.delete(id);
        
        return h.response().code(204);
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});