'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Get detail from a specific log`;

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/logs/{id}',
  options: {
    tags: ['api', 'logs'],
    description: 'Get Log by ID',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      params: Joi.object({
        id: Joi.number().integer().required()
      })
    },
    response: {
      status: {
        200: Joi.object({
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
      }
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { logsService } = request.services();

        const { credentials } = request.auth;
        const organizationId = credentials.organization_id;

        if (!organizationId) {
          throw badRequest('Se requiere ID de organización');
        }

        //const log = await logsService.findById(id, organizationId);
        const log = await logsService.findAllLogs({
          organizationId,
          id
        });

        return log;
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'Ocurrió un error', error);
      }
    }
  }
});
