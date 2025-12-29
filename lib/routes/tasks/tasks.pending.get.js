'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: Task } = require('../../models/task');
const { internal } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/tasks/pending',
  options: {
    tags: ['api', 'tasks'],
    description: 'Get pending tasks for the current hour (for n8n integration)',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'system'] // Requiere permisos de sistema para n8n
    },
    response: {
      status: {
        200: Joi.object({
          data: Joi.array().items(Task).label('Tasks')
        }).label('PendingTasksResponse'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      query: Joi.object({
        hour: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        date: Joi.date().iso(),
        status: Joi.string().valid('created', 'in progress', 'on hold').default('created')
      })
    },
    handler: async (request, h) => {
      try {
        const { tasksService } = request.services();
        const { hour, date, status } = request.query;

        // Si no se proporcionan hora o fecha, usar las actuales
        const now = new Date();
        const currentHour =
          hour || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentDate = date || now.toISOString().split('T')[0];

        const tasks = await tasksService.getTasksPending(currentHour, currentDate, status);

        return h
          .response({
            data: tasks
          })
          .code(200);
      } catch (error) {
        request.log(['error', 'tasks'], error);
        throw internal(error.message || 'An error occurred', error);
      }
    }
  }
});
