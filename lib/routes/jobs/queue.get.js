'use strict';

const Joi = require('joi');

module.exports = {
  method: 'GET',
  path: '/jobs/queue',
  options: {
    tags: ['api', 'jobs'],
    description: 'Get notification queue status and statistics',
    notes: 'Returns current state of the notification queue and upcoming tasks',
    auth: {
      strategy: 'jwt',
      // scope: ['admin', 'jobs:read']
    },
    validate: {
      query: Joi.object({
        includeJobs: Joi.boolean().default(false)
          .description('Include recent jobs in the response'),
        upcomingDays: Joi.number().integer().min(1).max(30).default(7)
          .description('Number of upcoming days to include in upcoming tasks')
      })
    },
    handler: async (request, h) => {
      const { notificationQueueService } = request.server.services();
      const { tasksService } = request.server.services();
      const { includeJobs, upcomingDays } = request.query;
      
      try {
        // Obtener conteos de trabajos
        const jobCounts = await notificationQueueService.getJobCounts();
        
        // Preparar respuesta base
        const response = {
          status: 'operational',
          jobs: jobCounts,
          workers: notificationQueueService.config.concurrency || 1
        };
        
        // Si jobCounts.active > 0, el estado es 'working'
        if (jobCounts.active > 0) {
          response.status = 'working';
        }
        
        // Si hay trabajos fallidos y ninguno activo, el estado es 'attention_needed'
        if (jobCounts.failed > 0 && jobCounts.active === 0) {
          response.status = 'attention_needed';
        }
        
        // Obtener tareas programadas para los próximos días
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + upcomingDays);
        
        // Usar el servicio de tareas para obtener las tareas programadas
        const upcomingTasksResult = await tasksService.findAll({
          from_date: today.toISOString().split('T')[0],
          to_date: endDate.toISOString().split('T')[0],
          page: 1,
          limit: 100
        });
        
        // Mapear las tareas al formato deseado
        response.upcomingTasks = upcomingTasksResult.data.map(task => ({
          id: task.id,
          name: task.name,
          notification_date: task.notification_date,
          notification_time: task.actity_time,
          status: task.status,
          type: task.notification_type
        }));
        
        // Ordenar por fecha y hora
        response.upcomingTasks.sort((a, b) => {
          const dateA = new Date(`${a.notification_date}T${a.notification_time}`);
          const dateB = new Date(`${b.notification_date}T${b.notification_time}`);
          return dateA - dateB;
        });
        
        // Incluir trabajos recientes si se solicita
        if (includeJobs) {
          // Obtener trabajos de cada estado
          const recentJobs = [];
          
          // Obtener trabajos activos y en espera
          const activeJobs = await notificationQueueService.getJobs(['active', 'waiting'], 0, 10);
          activeJobs.forEach(job => {
            recentJobs.push({
              id: job.id,
              state: job.state || (job._progress ? 'active' : 'waiting'),
              taskId: job.data ? job.data.taskId : null,
              timestamp: new Date(job.timestamp || Date.now()),
              data: job.data || {},
              attempts: job.attemptsMade || 0,
              result: null,
              error: null
            });
          });
          
          // Obtener trabajos completados
          const completedJobs = await notificationQueueService.getJobs(['completed'], 0, 5);
          completedJobs.forEach(job => {
            recentJobs.push({
              id: job.id,
              state: 'completed',
              taskId: job.data ? job.data.taskId : null,
              timestamp: new Date(job.timestamp || Date.now()),
              data: job.data || {},
              attempts: job.attemptsMade || 0,
              result: job.returnvalue || null,
              error: null
            });
          });
          
          // Obtener trabajos fallidos
          const failedJobs = await notificationQueueService.getJobs(['failed'], 0, 5);
          failedJobs.forEach(job => {
            recentJobs.push({
              id: job.id,
              state: 'failed',
              taskId: job.data ? job.data.taskId : null,
              timestamp: new Date(job.timestamp || Date.now()),
              data: job.data || {},
              attempts: job.attemptsMade || 0,
              result: null,
              error: job.failedReason || 'Unknown error'
            });
          });
          
          // Ordenar por timestamp descendente
          recentJobs.sort((a, b) => b.timestamp - a.timestamp);
          
          response.recentJobs = recentJobs;
        }
        
        return response;
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error fetching queue status',
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      }
    }
  }
};