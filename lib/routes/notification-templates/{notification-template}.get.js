'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: NotificationTemplate } = require('../../models/notification-template');
const { notFound, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/notification-templates/{id}',
  options: {
    tags: ['api', 'notifications'],
    description: 'Get notification template by ID',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        200: NotificationTemplate.label('NotificationTemplate'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      params: Joi.object({
        id: Joi.number().integer().required()
      })
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { notificationTemplatesService } = request.services();
        
        const template = await notificationTemplatesService.findOne(id);
        
        if (!template) {
          return notFound(`Notification template with ID ${id} not found`);
        }
        
        return h.response(template).code(200);
      } catch (error) {
        request.log(['error', 'notification-templates'], error);
        
        if (error.isBoom) {
          throw error;
        }
        
        throw internal(error.message || 'An error occurred', error);
      }
    }
  }
});