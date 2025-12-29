'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: Task } = require('../../models/task');
const { internal } = require('@hapi/boom');
const { auth } = require('@hapipal/toys');

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/tasks',
  options: {
    tags: ['api', 'tasks'],
    description: 'Create a new task for any type (task, document, request)',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        201: Joi.object({
          statusCode: Joi.number().required().example(201),
          message: Joi.string().required().example('Task created successfully'),
          data: Task.label('Task')
        }).label('TaskCreated'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      payload: Joi.object({
        name: Joi.string().required(),
        request_id: Joi.string().allow(null, ''),
        description: Joi.string().allow(null, ''),
        end_date: Joi.date().allow(null, ''),
        number_period: Joi.string().allow(null, ''),
        select_period: Joi.string().default('dias'),
        actity_time: Joi.string().default('09:00'),
        notification_date: Joi.date().required(),
        userManager: Joi.string().required(), // Lista de usuarios en formato JSON
        metadata_request: Joi.object().allow(null, ''),
        company_id: Joi.number().allow(null, ''),
        notification_type: Joi.string().valid('document', 'request', 'task').required(),
        notification_type_id: Joi.string().allow(null, '')
      }).required()
    },
    handler: async (request, h) => {
      try {
        const {
          payload,
          auth: { credentials }
        } = request;

        const { tasksService } = request.services();

        // Agregar información del creador
        const taskData = {
          ...payload,
          created_by: credentials.user,
          status: 'created'
        };

        const createdTask = await tasksService.create(taskData);

        return h
          .response({
            statusCode: 201,
            message: 'Task created successfully',
            data: createdTask
          })
          .code(201);
      } catch (error) {
        request.log(['error', 'tasks'], error);
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});
