'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = {
  method: 'POST',
  path: '/jobs/{id}/retry',
  options: {
    tags: ['api', 'jobs'],
    description: 'Retry a failed job',
    notes: 'Retries a job that previously failed',
    auth: {
      strategy: 'jwt',
    //   scope: ['admin', 'jobs:write']
    },
    validate: {
      params: Joi.object({
        id: Joi.string().required()
          .description('Job ID to retry')
      })
    },
    response: {
      schema: Joi.object({
        success: Joi.boolean().required(),
        message: Joi.string().required(),
        job: Joi.object({
          id: Joi.string().required(),
          state: Joi.string().required(),
          taskId: Joi.string().allow(null),
          attempts: Joi.number().integer()
        }).required()
      }).label('JobRetryResponse')
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
        
        // Solo se pueden reintentar trabajos fallidos
        if (job.state !== 'failed' && job.finishedOn && !job.returnvalue) {
          return Boom.badRequest(`Job with ID ${id} is not in a failed state`);
        }
        
        // Reintentar el trabajo
        await notificationQueueService.queue.retry(id);
        
        // Obtener el trabajo actualizado
        const updatedJob = await notificationQueueService.getJob(id);
        
        return {
          success: true,
          message: `Job ${id} has been scheduled for retry`,
          job: {
            id: updatedJob.id,
            state: updatedJob.state || 'waiting',
            taskId: updatedJob.data ? updatedJob.data.taskId : null,
            attempts: updatedJob.attemptsMade || 0
          }
        };
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error retrying job',
          jobId: id,
          error: error.message
        });
        
        return Boom.badImplementation(`Error retrying job: ${error.message}`);
      }
    }
  }
};