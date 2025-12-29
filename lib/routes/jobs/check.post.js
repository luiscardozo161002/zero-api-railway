'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');

module.exports = {
  method: 'POST',
  path: '/jobs/check',
  options: {
    tags: ['api', 'jobs'],
    description: 'Trigger a check for pending tasks',
    notes: 'Manually triggers the scheduler to check for tasks due for notification',
    auth: {
      strategy: 'jwt'
    },
    validate: {
      payload: Joi.object({
        checkAll: Joi.boolean().default(false)
          .description('Check all "created" tasks regardless of date (for debugging)'),
        ignoreTime: Joi.boolean().default(false)
          .description('Ignore scheduled time and process all tasks for today'),
        endDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .description('End date (YYYY-MM-DD) to check tasks until')
      }).allow(null)
    },
    handler: async (request, h) => {
      const { notificationQueueService } = request.server.services();
      const { tasksService } = request.server.services();
      const payload = request.payload || {};
      const { checkAll, ignoreTime, endDate } = payload;
      
      try {
        // Primero, para debug, buscar todas las tareas en estado "created"
        const allCreatedTasks = await tasksService.findAll({
          status: 'created',
          page: 1,
          limit: 100
        });
        
        request.server.log(['info', 'jobs', 'debug'], {
          message: 'All tasks with status "created"',
          count: allCreatedTasks.data.length,
          tasks: allCreatedTasks.data.map(t => ({
            id: t.id,
            name: t.name,
            date: t.notification_date,
            time: t.actity_time
          }))
        });
        
        // Si checkAll es true, procesar todas las tareas independientemente de la fecha
        if (checkAll) {
          const result = { success: true, count: 0, tasks: [] };
          
          for (const task of allCreatedTasks.data) {
            try {
              const jobResult = await notificationQueueService.processTask(task.id);
              if (jobResult.success) {
                result.tasks.push({
                  jobId: jobResult.jobId,
                  taskId: task.id,
                  name: task.name
                });
                result.count++;
              }
            } catch (err) {
              request.server.log(['error', 'jobs'], {
                message: `Error processing task ${task.id}`,
                error: err.message
              });
            }
          }
          
          result.message = `Processed ${result.count} tasks manually`;
          return result;
        }
        
        // Ejecutar checkPendingTasks con las opciones especificadas
        return await notificationQueueService.checkPendingTasks({
          ignoreTime,
          endDate
        });
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error checking pending tasks',
          error: error.message
        });
        
        return Boom.badImplementation(`Error checking pending tasks: ${error.message}`);
      }
    }
  }
};