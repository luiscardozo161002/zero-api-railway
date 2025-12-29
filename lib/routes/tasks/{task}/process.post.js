'use strict';

const Helpers = require('../../helpers');
const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/tasks/{id}/process',
  options: {
    tags: ['api', 'tasks', 'jobs'],
    description: 'Process a task manually',
    notes: 'Adds a job to the queue to process a task regardless of its scheduled time',
    auth: {
      strategy: 'jwt'
      //   scope: ['admin', 'tasks:write']
    },
    validate: {
      params: Joi.object({
        id: Joi.string().uuid().required().description('Task ID to process')
      })
    },
    response: {
      schema: Joi.object({
        success: Joi.boolean().required(),
        message: Joi.string().required(),
        jobId: Joi.string().required(),
        taskId: Joi.string().required(),
        taskName: Joi.string().allow(null),
        status: Joi.string().required()
      }).label('ProcessTaskResponse')
    },
    handler: async (request, h) => {
      const { tasksService, notificationQueueService } = request.server.services();
      const { id } = request.params;

      try {
        // Verificar si la tarea existe
        const task = await tasksService.findOne(id);

        if (task && task.status === 'completed') {
          return Boom.conflict(`Task with ID ${id} is already completed`);
        }

        // Verificar si ya hay un trabajo activo para esta tarea
        const activeJobs = await notificationQueueService.getJobs(['active', 'waiting']);
        const isAlreadyQueued = activeJobs.some((job) => job.data && job.data.taskId === id);

        if (isAlreadyQueued) {
          return Boom.conflict(`Task with ID ${id} is already being processed`);
        }

        // Procesar la tarea
        const result = await notificationQueueService.processTask(id);

        return {
          success: true,
          message: `Task ${id} queued for processing`,
          jobId: result.jobId,
          taskId: result.taskId,
          taskName: task.name,
          status: result.status
        };
      } catch (error) {
        // Si el error es de Boom, propagarlo
        if (error.isBoom) {
          throw error;
        }

        request.server.log(['error', 'tasks'], {
          message: 'Error processing task',
          taskId: id,
          error: error.message
        });

        return Boom.badImplementation(`Error processing task: ${error.message}`);
      }
    }
  }
});
