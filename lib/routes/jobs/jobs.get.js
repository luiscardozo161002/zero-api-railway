'use strict';

const Joi = require('joi');

module.exports = {
  method: 'GET',
  path: '/jobs',
  options: {
    tags: ['api', 'jobs'],
    description: 'Get notification jobs with filtering',
    notes: 'Retrieves jobs with pagination and filtering options',
    auth: {
      strategy: 'jwt',
    //   scope: ['admin', 'jobs:read']
    },
    validate: {
      query: Joi.object({
        types: Joi.string().default('waiting,active,delayed,failed,completed')
          .description('Comma separated list of job types to include'),
        page: Joi.number().integer().min(1).default(1)
          .description('Page number'),
        limit: Joi.number().integer().min(1).max(100).default(20)
          .description('Number of items per page'),
        taskId: Joi.string().uuid()
          .description('Filter by taskId'),
        sortBy: Joi.string().valid('timestamp', 'attempts').default('timestamp')
          .description('Field to sort by'),
        sortDir: Joi.string().valid('asc', 'desc').default('desc')
          .description('Sort direction')
      })
    },
    response: {
      schema: Joi.object({
        data: Joi.array().items(Joi.object({
          id: Joi.string().required(),
          state: Joi.string().required(),
          taskId: Joi.string().allow(null),
          timestamp: Joi.date().iso().required(),
          data: Joi.object().required(),
          attempts: Joi.number().integer().required(),
          result: Joi.any().allow(null),
          error: Joi.string().allow(null),
          finishedOn: Joi.date().iso().allow(null)
        })).required(),
        pagination: Joi.object({
          page: Joi.number().integer().required(),
          limit: Joi.number().integer().required(),
          totalItems: Joi.number().integer().required(),
          totalPages: Joi.number().integer().required()
        }).required()
      }).label('JobsListResponse')
    },
    handler: async (request, h) => {
      const { notificationQueueService } = request.server.services();
      const { page, limit, types, taskId } = request.query;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      // Convertir tipos a arreglo
      const jobTypes = types.split(',').map(t => t.trim());
      
      try {
        // Obtener todos los trabajos de los tipos solicitados
        let jobs = await notificationQueueService.getJobs(jobTypes, 0, 1000);
        
        // Filtrar por taskId si se especifica
        if (taskId) {
          jobs = jobs.filter(job => 
            job.data && job.data.taskId === taskId
          );
        }
        
        // Ordenar según criterios
        const { sortBy, sortDir } = request.query;
        jobs.sort((a, b) => {
          let aValue
          let bValue;
          
          switch (sortBy) {
            case 'attempts':
              aValue = a.attemptsMade || 0;
              bValue = b.attemptsMade || 0;
              break;
            case 'timestamp':
            default:
              aValue = a.timestamp || 0;
              bValue = b.timestamp || 0;
              break;
          }
          
          return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Calcular total y paginación
        const totalItems = jobs.length;
        const totalPages = Math.ceil(totalItems / limit);
        
        // Aplicar paginación
        const paginatedJobs = jobs.slice(start, end).map(job => {
          return {
            id: job.id,
            state: job.state || (job._progress ? 'active' : 'waiting'),
            taskId: job.data ? job.data.taskId : null,
            timestamp: new Date(job.timestamp || Date.now()),
            data: job.data || {},
            attempts: job.attemptsMade || 0,
            result: job.returnvalue || null,
            error: job.failedReason || null,
            finishedOn: job.finishedOn ? new Date(job.finishedOn) : null
          };
        });
        
        return {
          data: paginatedJobs,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages
          }
        };
      } catch (error) {
        request.server.log(['error', 'jobs'], {
          message: 'Error fetching jobs',
          error: error.message
        });
        
        throw error;
      }
    }
  }
};