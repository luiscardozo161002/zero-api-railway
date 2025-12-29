'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

const notes = `Get organizations with optional filtering`;

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/organizations',
  options: {
    tags: ['api', 'organizations'],
    description: 'List organizations',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      query: Joi.object({
        name: Joi.string().optional().description('Filter by name (partial match)'),
        subdomain: Joi.string().optional().description('Filter by subdomain (partial match)'),
        active: Joi.boolean().optional().description('Filter by active status'),
        includeDeleted: Joi.boolean().optional().default(false).description('Include soft deleted organizations'),
        page: Joi.number().integer().min(1).default(1).description('Page number'),
        limit: Joi.number().integer().min(1).max(100).default(25).description('Items per page')
      }).options({ stripUnknown: true })
    },
    response: {
      status: {
        200: Joi.object({
          results: Joi.array().items(Joi.object({
            id: Joi.number().integer().required(),
            name: Joi.string().required(),
            subdomain: Joi.string().required(),
            is_active: Joi.boolean().required(),
            created_at: Joi.date().required(),
            updated_at: Joi.date().required(),
            deleted_at: Joi.date().allow(null)
          })),
          pagination: Joi.object({
            page: Joi.number().integer().required(),
            limit: Joi.number().integer().required(),
            totalPages: Joi.number().integer().required(),
            totalItems: Joi.number().integer().required()
          })
        })
      }
    },
    handler: async (request, h) => {
      try {
        const { query } = request;
        const { organizationsService } = request.services();
        
        const filters = {
          name: query.name,
          subdomain: query.subdomain,
          active: query.active
        };
        
        const pagination = {
          page: query.page,
          limit: query.limit
        };
        
        const result = await organizationsService.findAll({
          filters,
          pagination,
          includeDeleted: query.includeDeleted
        });
        
        return result;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});