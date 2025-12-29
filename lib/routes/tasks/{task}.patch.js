'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { patchSchema: PatchTask, publicSchema: Task } = require('../../models/task');
const { notFound, internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'PATCH',
  path: '/tasks/{id}',
  options: {
    tags: ['api', 'tasks'],
    description: 'Update an existing task',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        200: Joi.object({
          statusCode: Joi.number().required().example(200),
          message: Joi.string().required().example('Task updated successfully'),
          data: Task.label('Task')
        }).label('TaskUpdated'),
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
      }),
      payload: PatchTask.required()
    },
    handler: async (request, h) => {
      try {
        const {
          params: { id },
          payload,
          auth: { credentials }
        } = request;

        const { tasksService } = request.services();
        
        // Agregar información del modificador
        const updateData = {
          ...payload,
          updated_by: credentials.id
        };
        
        const updatedTask = await tasksService.update(id, updateData);
        
        if (!updatedTask) {
          return notFound(`Task with ID ${id} not found`);
        }

        return h.response({
          statusCode: 200,
          message: 'Task updated successfully',
          data: updatedTask
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