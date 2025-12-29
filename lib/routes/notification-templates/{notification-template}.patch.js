'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { patchSchema: PatchTemplate, publicSchema: NotificationTemplate } = require('../../models/notification-template');
const { notFound, badRequest, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/notification-templates/{id}',
  options: {
    tags: ['api', 'notifications'],
    description: 'Update a notification template',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff'] // Solo admin y staff pueden actualizar plantillas
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('Notification template updated successfully'),
          data: NotificationTemplate.label('NotificationTemplate')
        }).label('NotificationTemplateUpdated'),
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
      }),
      payload: PatchTemplate.required()
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { payload } = request;
        const { notificationTemplatesService } = request.services();
        
        // Verificar si la plantilla existe
        const existingTemplate = await notificationTemplatesService.findOne(id);
        
        if (!existingTemplate) {
          return notFound(`Notification template with ID ${id} not found`);
        }
        
        // Verificar si estamos actualizando el nombre y ya existe otra plantilla con ese nombre
        if (payload.template_name && payload.template_name !== existingTemplate.template_name) {
          try {
            const templates = await notificationTemplatesService.findAll();
            const duplicateTemplate = templates.find(t => 
              t.template_name === payload.template_name && t.id !== parseInt(id)
            );
            
            if (duplicateTemplate) {
              return badRequest(`Template with name '${payload.template_name}' already exists`);
            }
          } catch (error) {
            // Si hay un error al buscar plantillas, continuamos con la actualización
            request.log(['warning', 'notification-templates'], 'Error checking for duplicate templates');
          }
        }
        
        const updatedTemplate = await notificationTemplatesService.update(id, payload);
        
        return h.response({
          statusCode: 200,
          message: 'Notification template updated successfully',
          data: updatedTemplate
        }).code(200);
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