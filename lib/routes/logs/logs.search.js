'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Search logs by message content`;

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/logs/search',
  options: {
    tags: ['api', 'logs'],
    description: 'Search logs by message',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      query: Joi.object({
        message: Joi.string().required().min(3).description('Text to search in log messages'),
        page: Joi.number().integer().min(1).default(1).description('Page number'),
        limit: Joi.number().integer().min(1).max(100).default(25).description('Items per page')
      })
    },
    response: {
      status: {
        200: Joi.object({
          results: Joi.array().items(
            Joi.object({
              id: Joi.number().integer().required(),
              organization_id: Joi.number().integer().required(),
              level: Joi.string().required(),
              message: Joi.string().required(),
              source: Joi.string().allow(null, ''),
              user_id: Joi.string().uuid().allow(null),
              ip_address: Joi.string().allow(null, ''),
              request_data: Joi.object().allow(null),
              request_detail: Joi.object().allow(null),
              stack_trace: Joi.string().allow(null, ''),
              created_at: Joi.date().required()
            }).unknown(true)
          ),
          pagination: Joi.object({
            page: Joi.number().integer().required(),
            limit: Joi.number().integer().required(),
            totalItems: Joi.number().integer().required(),
            totalPages: Joi.number().integer().required()
          })
        })
      }
    },
    handler: async (request, h) => {
      try {
        const { message, page, limit } = request.query;
        const { logsService } = request.services();
        const { credentials } = request.auth;
        
        const organizationId = credentials.organization_id;
        
        if (!organizationId) {
          throw badRequest('Se requiere ID de organización');
        }
        
        const result = await logsService.findAllLogs({
          organizationId,
          messageQuery: message,
          pagination: { page, limit }
        });
        
        return result;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'Ocurrió un error', error);
      }
    }
  }
});