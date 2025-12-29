'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { notFound, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'DELETE',
  path: '/tasks/{id}',
  options: {
    tags: ['api', 'tasks'],
    description: 'Delete a task',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff'] // Solo administradores y staff pueden eliminar tareas
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('Task deleted successfully')
        }).label('TaskDeleted'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        404: Helpers.HTTP_404,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      params: Joi.object({
        id: Joi.string().uuid().required()
      })
    },
    handler: async (request, h) => {
      try {
        const { id } = request.params;
        const { tasksService } = request.services();
        
        const deleted = await tasksService.delete(id);
        
        if (!deleted) {
          return notFound(`Task with ID ${id} not found`);
        }

        return h.response({
          statusCode: 200,
          message: 'Task deleted successfully'
        }).code(200);
      } catch (error) {
        request.log(['error', 'tasks'], error);
        if (error.isBoom && error.output.statusCode === 404) {
          throw error;
        }
        
        throw internal(error.message || 'An error occurred', error);
      }
    }
  }
});