'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = {
  method: 'POST',
  path: '/jobs/cleanup',
  options: {
    tags: ['api', 'jobs'],
    description: 'Clean up old jobs',
    notes: 'Removes completed and/or failed jobs that are older than the specified grace period',
    auth: {
      strategy: 'jwt',
      // scope: ['admin', 'jobs:delete']
    },
    validate: {
      payload: Joi.object({
        grace: Joi.number().integer().min(0).default(24 * 3600 * 1000) // 24 hours by default
          .description('Grace period in milliseconds'),
        status: Joi.string().valid('completed', 'failed', 'all').default('all')
          .description('Job status to clean up'),
        limit: Joi.number().integer().min(1).max(5000).default(1000)
          .description('Maximum number of jobs to clean up')
      }).label('CleanupJobsPayload')
    },
    response: {
      schema: Joi.object({
        success: Joi.boolean().required(),
        message: Joi.string().required(),
        cleaned: Joi.object({
          completed: Joi.number().integer().required(),
          failed: Joi.number().integer().required(),
          total: Joi.number().integer().required()
        }).required()
      }).label('CleanupJobsResponse')
    },
    handler: async (request, h) => {
      const { notificationQueueService } = request.server.services();
      const { grace, status, limit } = request.payload;
      
      try {
        let completedCount = 0;
        let failedCount = 0;
        
        if (status === 'all' || status === 'completed') {
          // Limpiar trabajos completados
          const completedJobs = await notificationQueueService.cleanJobs(grace, 'completed', limit);
          completedCount = Array.isArray(completedJobs) ? completedJobs.length : 0;
          
          request.server.log(['info', 'jobs'], {
            message: 'Cleaned completed jobs',
            count: completedCount,
            grace,
            limit
          });
        }
        
        if (status === 'all' || status === 'failed') {
          // Limpiar trabajos fallidos
          const failedJobs = await notificationQueueService.cleanJobs(grace, 'failed', limit);
          failedCount = Array.isArray(failedJobs) ? failedJobs.length : 0;
          
          request.server.log(['info', 'jobs'], {
            message: 'Cleaned failed jobs',
            count: failedCount,
            grace,
            limit
          });
        }
        
        return {
          success: true,
          message: `Successfully cleaned up ${completedCount + failedCount} jobs`,
          cleaned: {
            completed: completedCount,
            failed: failedCount,
            total: completedCount + failedCount
          }
        };
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error cleaning up jobs',
          error: error.message
        });
        
        return Boom.badImplementation(`Error cleaning up jobs: ${error.message}`);
      }
    }
  }
};