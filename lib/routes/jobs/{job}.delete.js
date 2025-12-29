'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = {
  method: 'DELETE',
  path: '/jobs/{id}',
  options: {
    tags: ['api', 'jobs'],
    description: 'Remove a job from the queue',
    notes: 'Removes a job from the queue regardless of its state',
    auth: {
      strategy: 'jwt',
    //   scope: ['admin', 'jobs:delete']
    },
    validate: {
      params: Joi.object({
        id: Joi.string().required()
          .description('Job ID to remove')
      })
    },
    response: {
      schema: Joi.object({
        success: Joi.boolean().required(),
        message: Joi.string().required()
      }).label('JobDeleteResponse')
    },
    handler: async (request, h) => {
      const { notificationQueueService } = request.server.services();
      const { id } = request.params;
      
      try {
        // Verificar si el trabajo existe
        const job = await notificationQueueService.getJob(id);
        
        if (!job) {
          return Boom.notFound(`Job with ID ${id} not found`);
        }
        
        // Si es una cola Bull real, usamos su método remove
        // Si es un MockQueue, simulamos la eliminación
        if (typeof job.remove === 'function') {
          await job.remove();
        } else {
          // Para MockQueue
          if (notificationQueueService.queue.jobs && typeof notificationQueueService.queue.jobs.delete === 'function') {
            notificationQueueService.queue.jobs.delete(id);
            
            // También eliminarlo de las listas por estado
            for (const state of ['waiting', 'active', 'completed', 'failed']) {
              if (notificationQueueService.queue.jobsByState && 
                  notificationQueueService.queue.jobsByState[state] && 
                  typeof notificationQueueService.queue.jobsByState[state].delete === 'function') {
                notificationQueueService.queue.jobsByState[state].delete(id);
              }
            }
          }
        }
        
        request.server.log(['info', 'jobs'], {
          message: 'Job removed',
          jobId: id
        });
        
        return {
          success: true,
          message: `Job ${id} has been removed`
        };
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error removing job',
          jobId: id,
          error: error.message
        });
        
        return Boom.badImplementation(`Error removing job: ${error.message}`);
      }
    }
  }
};