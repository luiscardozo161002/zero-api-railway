'use strict';

const Joi = require('joi');
const Boom = require('@hapi/boom');
const { debug } = require('request');

module.exports = {
  method: 'GET',
  path: '/tasks',
  options: {
    tags: ['api', 'tasks'],
    description: 'Get tasks with filtering options',
    notes: 'Retrieves tasks with pagination and filtering, including upcoming scheduled tasks',
    auth: {
      strategy: 'jwt'
      // scope: ['admin', 'tasks:read']
    },
    validate: {
      query: Joi.object({
        status: Joi.string().description('Filter by task status'),
        notification_type: Joi.string().description('Filter by notification type'),
        from_date: Joi.string().description('Filter by notification date from'),
        to_date: Joi.string().description('Filter by notification date to'),
        upcoming: Joi.boolean().default(false).description('Show only upcoming tasks'),
        page: Joi.number().integer().min(1).default(1).description('Page number'),
        limit: Joi.number().integer().min(1).max(100).default(20).description('Number of items per page'),
        all_data: Joi.boolean().default(false).description('Skip limit to get all data')
      }).label('TasksListQuery')
    },
    handler: async (request, h) => {
      const { tasksService } = request.server.services();
      const { page, limit, upcoming, all_data, ...query } = request.query;

      try {
        let result;

        if (upcoming) {
          // Si se solicitan tareas próximas, usar una lógica diferente
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          // Consultar tareas de hoy y mañana con estado 'created'
          result = await tasksService.findAll({
            status: 'created',
            from_date: today,
            to_date: tomorrowStr,
            page,
            limit,
            all_data
          });

          // Enriquecer los datos con información de próxima ejecución
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          result.data = result.data.map((task) => {
            const taskTime = task.actity_time ? task.actity_time.split(':') : ['00', '00'];
            const taskHour = parseInt(taskTime[0], 10);
            const taskMinute = parseInt(taskTime[1], 10);

            // Calcular si la tarea es para hoy o mañana
            const isToday = task.notification_date.toISOString().split('T')[0] === today;
            const isPastTimeToday =
              isToday && (taskHour < currentHour || (taskHour === currentHour && taskMinute <= currentMinute));

            return {
              ...task,
              upcoming: {
                isPending: !isPastTimeToday,
                executionTime: `${taskTime[0]}:${taskTime[1]}`,
                executionDate: isToday ? 'Today' : 'Tomorrow'
              }
            };
          });

          // Ordenar por hora de ejecución
          result.data.sort((a, b) => {
            // Primero por fecha
            const aDate = a.notification_date.toISOString();
            const bDate = b.notification_date.toISOString();
            if (aDate !== bDate) return aDate.localeCompare(bDate);

            // Luego por hora
            return a.actity_time.localeCompare(b.actity_time);
          });
        } else {
          // Búsqueda normal con filtros
          result = await tasksService.findAll({
            ...query,
            page,
            limit,
            all_data
          });
        }

        return result;
      } catch (error) {
        request.server.log(['error', 'tasks'], {
          message: 'Error fetching tasks',
          error: error.message
        });

        if (error.isBoom) {
          throw error;
        }

        return Boom.badImplementation(`Error fetching tasks: ${error.message}`);
      }
    }
  }
};
