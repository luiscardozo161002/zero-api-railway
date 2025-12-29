'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: NotificationLog } = require('../../models/notification-log');
const { internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/notification-logs',
  options: {
    tags: ['api', 'notifications'],
    description: 'Get notification logs with filters',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        200: Joi.object({
          data: Joi.array().items(NotificationLog).label('NotificationLogs'),
          pagination: Joi.object({
            page: Joi.number().integer().required(),
            limit: Joi.number().integer().required(),
            totalItems: Joi.number().integer().required(),
            totalPages: Joi.number().integer().required()
          }).label('Pagination')
        }).label('NotificationLogsResponse'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      query: Joi.object({
        task_id: Joi.string().uuid(),
        status: Joi.string().valid('success', 'failed'),
        from_date: Joi.date().iso(),
        to_date: Joi.date().iso().min(Joi.ref('from_date')),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10)
      })
    },
    handler: async (request, h) => {
      try {
        const { notificationLogsService } = request.services();
        
        const result = await notificationLogsService.findRecentLogs(request.query);
        
        return h.response(result).code(200);
      } catch (error) {
        request.log(['error', 'notification-logs'], error);
        throw internal(error.message || 'An error occurred', error);
      }
    }
  }
});