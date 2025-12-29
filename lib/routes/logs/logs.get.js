'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Get the logs using filters`;

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/logs',
  options: {
    tags: ['api', 'logs'],
    description: 'Get the logs using filters',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      query: Joi.object({
        level: Joi.string().valid('info', 'warning', 'error', 'debug').optional(),
        source: Joi.string().optional(),
        dateFrom: Joi.date().iso().optional(),
        dateTo: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(25)
      }).options({ stripUnknown: true })
    },
    response: {
      status: {
        200: Joi.object({
          results: Joi.array().items(
            Joi.object({
              id: Joi.number().integer().required(),
              level: Joi.string().required(),
              message: Joi.string().required(),
              source: Joi.string().allow(null, ''),
              //user_id: Joi.number().integer().allow(null),
              //ip_address: Joi.string().allow(null, ''),
              //request_data: Joi.object().allow(null),
              //request_detail: Joi.object().allow(null), 
              //stack_trace: Joi.string().allow(null, ''),
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
        const { query } = request;
        const { logsService } = request.services();
        const { payload } = request.auth.artifacts.decoded;
        const { credentials } = request.auth;
        const organizationId = credentials.organization_id;

        if (!organizationId) {
          throw badRequest('Se requiere ID de organización');
        }

        const filters = {
          level: query.level,
          source: query.source,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo
        };

        const pagination = {
          page: query.page,
          limit: query.limit
        };
        
        //const result = await logsService.findLogs({
        const result = await logsService.findAllLogs({ 
          organizationId,
          filters,
          pagination
        });

        return {
          results: result.results,
          pagination: result.pagination
        };
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'Ocurrió un error', error);
      }
    }
  }
});
