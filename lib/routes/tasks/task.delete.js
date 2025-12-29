'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');
// const { debug } = require('request');

module.exports = {
  method: 'DELETE',
  path: '/tasks',
  options: {
    tags: ['api', 'tasks'],
    description: 'Remove tasks by params',
    notes: 'Remove all tasks with an specific hours and limit',
    auth: {
      strategy: 'jwt'
      // scope: ['admin', 'tasks:read']
    },
    validate: {
      query: Joi.object({
        hours: Joi.number().description('Hours limit').default(24),
        limit: Joi.number().description('Records limit size').default(1000),
        status: Joi.string().description('Status to delete').default(null)
      }).label('TaskDeleteMass')
    },
    handler: async (request, h) => {
      try {
        const { hours, limit, status } = request.query;
        const { tasksService } = request.services();
        const options = { filter: { status } };
        const deletedTasksCount = await tasksService.deleteByHours(hours, limit, options);
        return { count: deletedTasksCount };
      } catch (error) {
        request.server.log(['error', 'tasks'], {
          message: 'Error removing tasks',
          error: error.message
        });

        if (error.isBoom) {
          throw error;
        }

        return Boom.badImplementation(`Error removing tasks: ${error.message}`);
      }
    }
  }
};
