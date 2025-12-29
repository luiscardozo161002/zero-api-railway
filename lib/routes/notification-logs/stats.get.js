'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/notification-logs/stats',
  options: {
    tags: ['api', 'notifications'],
    description: 'Get notification sending statistics',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff'] // Solo admin y staff pueden ver estadísticas
    },
    response: {
      status: {
        200: Joi.object({
          totalSent: Joi.number().integer().required(),
          successful: Joi.number().integer().required(),
          failed: Joi.number().integer().required(),
          byType: Joi.object({
            document: Joi.number().integer(),
            request: Joi.number().integer(),
            task: Joi.number().integer()
          }).unknown(true),
          byDay: Joi.array().items(
            Joi.object({
              date: Joi.string().required(),
              count: Joi.number().integer().required()
            })
          )
        }).label('NotificationStats'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { notificationLogsService } = request.services();
        
        const stats = await notificationLogsService.getStats();
        
        return h.response(stats).code(200);
      } catch (error) {
        request.log(['error', 'notification-logs'], error);
        throw internal(error.message || 'An error occurred', error);
      }
    }
  }
});