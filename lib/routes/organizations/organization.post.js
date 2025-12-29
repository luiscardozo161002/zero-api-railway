'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Create a new organization`;

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/organizations',
  options: {
    tags: ['api', 'organizations'],
    description: 'Create new organization',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      payload: Joi.object({
        name: Joi.string().max(100).required().example('Company ABC').description('Organization name'),
        subdomain: Joi.string().max(50).pattern(/^[a-z0-9-]+$/).lowercase().required().example('abc').description('Organization subdomain'),
        adminUser: Joi.object({
          email: Joi.string().email().required().example('admin@example.com'),
          password: Joi.string().required().example('secure-password'),
          full_name: Joi.string().required().example('Admin User'),
          role_id: Joi.number().integer().default(1).example(1)
        }).optional().description('Initial admin user (optional)')
      }).options({ stripUnknown: true })
    },
    response: {
      status: {
        201: Joi.object({
          statusCode: Joi.number().required().example(201),
          message: Joi.string().required().example('Organization created successfully'),
          data: Joi.object({
            id: Joi.number().integer().required(),
            name: Joi.string().required(),
            subdomain: Joi.string().required(),
            is_active: Joi.boolean().required(),
            created_at: Joi.date().required(),
            updated_at: Joi.date().required()
          }).options({ stripUnknown: true })
        }).label('Created'),
        400: Helpers.HTTP_400,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { payload } = request;
        const { organizationsService } = request.services();
        
        // Validate subdomain format
        if (!/^[a-z0-9-]+$/.test(payload.subdomain)) {
          throw badRequest('Subdomain can only contain lowercase letters, numbers, and hyphens');
        }
        
        // Create organization with initial setup
        const createdOrganization = await organizationsService.onboardOrganization(payload);
        
        return h.response({
          statusCode: 201,
          message: 'Organization created successfully',
          data: createdOrganization
        }).code(201);
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});