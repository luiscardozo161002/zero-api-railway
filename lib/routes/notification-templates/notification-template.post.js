'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: NotificationTemplate } = require('../../models/notification-template');
const { badRequest, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/notification-templates',
  options: {
    tags: ['api', 'notifications'],
    description: 'Create a new notification template',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff'] // Solo admin y staff pueden crear plantillas
    },
    response: {
      status: {
        201: Joi.object({
          statusCode: Joi.number().required().example(201),
          message: Joi.string().required().example('Notification template created successfully'),
          data: NotificationTemplate.label('NotificationTemplate')
        }).label('NotificationTemplateCreated'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      payload: Joi.object({
        template_name: Joi.string().required(),
        notification_type: Joi.string().valid('document', 'request', 'task').required(),
        subject_template: Joi.string().required(),
        body_template: Joi.string().required(),
        active: Joi.boolean().default(true)
      }).required()
    },
    handler: async (request, h) => {
      try {
        const { payload } = request;
        const { notificationTemplatesService } = request.services();
        
        // Verificar si ya existe una plantilla con el mismo nombre
        try {
          const templates = await notificationTemplatesService.findAll();
          const existingTemplate = templates.find(t => t.template_name === payload.template_name);
          
          if (existingTemplate) {
            return badRequest(`Template with name '${payload.template_name}' already exists`);
          }
        } catch (error) {
          // Si hay un error al buscar plantillas, continuamos con la creación
          request.log(['warning', 'notification-templates'], 'Error checking for duplicate templates');
        }
        
        const template = await notificationTemplatesService.create(payload);
        
        return h.response({
          statusCode: 201,
          message: 'Notification template created successfully',
          data: template
        }).code(201);
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