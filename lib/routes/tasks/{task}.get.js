'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: Task } = require('../../models/task');
const { notFound } = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/tasks/{id}',
  options: {
    tags: ['api', 'tasks'],
    description: 'Get task by ID',
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'required',
      scope: ['admin', 'staff', 'user']
    },
    response: {
      status: {
        200: Task.label('Task'),
        400: Helpers.HTTP_400,
        401: Helpers.HTTP_401,
        403: Helpers.HTTP_403,
        404: Helpers.HTTP_404
      }
    },
    validate: {
      params: Joi.object({
        id: Joi.string().uuid().required()
      })
    },
    handler: async (request, h) => {
      const { tasksService } = request.services();
      const result = await tasksService.findOne(request.params.id);
      
      if (!result) {
        return notFound(`Task with ID ${request.params.id} not found`);
      }
      
      return h.response(result).code(200);
    }
  }
});