'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { notFound, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'DELETE',
  path: '/notification-templates/{id}',
  options: {
    tags: ['api', 'notifications'],
    description: 'Delete a notification template',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin'] // Solo administradores pueden eliminar plantillas
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('Notification template deleted successfully')
        }).label('NotificationTemplateDeleted'),
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
        
        // Verificar si la plantilla existe
        const existingTemplate = await notificationTemplatesService.findOne(id);
        
        if (!existingTemplate) {
          return notFound(`Notification template with ID ${id} not found`);
        }
        
        await notificationTemplatesService.delete(id);
        
        return h.response({
          statusCode: 200,
          message: 'Notification template deleted successfully'
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