'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: NotificationTemplate } = require('../../models/notification-template');
const { internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/notification-templates',
  options: {
    tags: ['api', 'notifications'],
    description: 'Get all notification templates',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        200: Joi.object({
          data: Joi.array().items(NotificationTemplate).label('NotificationTemplates')
        }).label('NotificationTemplatesResponse'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      query: Joi.object({
        notification_type: Joi.string().valid('document', 'request', 'task'),
        active: Joi.boolean()
      })
    },
    handler: async (request, h) => {
      try {
        const { notificationTemplatesService } = request.services();
        let templates;
        
        if (request.query.notification_type) {
          templates = await notificationTemplatesService.findByType(request.query.notification_type);
          // Convertir a array si el método devuelve un solo objeto
          templates = Array.isArray(templates) ? templates : [templates];
        } else {
          templates = await notificationTemplatesService.findAll();
          
          // Filtrar por estado activo si se proporciona en la consulta
          if (request.query.active !== undefined) {
            templates = templates.filter(t => t.active === request.query.active);
          }
        }
        
        return h.response({
          data: templates
        }).code(200);
      } catch (error) {
        request.log(['error', 'notification-templates'], error);
        
        // Si es un error "not found" y estamos buscando por tipo, intentar crear plantilla por defecto
        if (error.isBoom && error.output.statusCode === 404 && request.query.notification_type) {
          try {
            const { notificationTemplatesService } = request.services();
            const defaultTemplate = await notificationTemplatesService.getDefaultTemplate(request.query.notification_type);
            
            return h.response({
              data: [defaultTemplate]
            }).code(200);
          } catch (defaultError) {
            throw internal('Error creating default template', defaultError);
          }
        }
        
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});