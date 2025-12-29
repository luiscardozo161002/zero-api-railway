'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal, badRequest, notFound, isBoom } = require('@hapi/boom');

module.exports = class TasksService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   * Encontrar una tarea por ID
   * @param {string} id - El ID de la tarea
   * @returns {Promise<Object>} La tarea encontrada
   */
  async findOne(id) {
    const { Task } = this.server.models();

    try {
      const task = await Task.query().findOne({ id }).withGraphFetched('company');

      if (!task) {
        throw notFound(`Task with ID ${id} not found`);
      }

      return task;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error getting task: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Buscar tareas con filtros
   * @param {Object} query - Los filtros para la búsqueda
   * @returns {Promise<Array>} Lista de tareas
   */
  async findAll(query = {}) {
    const { Task } = this.server.models();
    const { status, notification_type, from_date, to_date, page = 1, limit = 10, all_data = false } = query;

    try {
      let taskQuery = Task.query();

      // Aplicar filtros si están presentes
      if (status) {
        taskQuery = taskQuery.where('status', status);
      }

      if (notification_type) {
        taskQuery = taskQuery.where('notification_type', notification_type);
      }

      if (from_date) {
        taskQuery = taskQuery.where('notification_date', '>=', from_date);
      }

      if (to_date) {
        taskQuery = taskQuery.where('notification_date', '<=', to_date);
      }

      // Aplicar paginación
      if (!all_data) {
        const offset = (page - 1) * limit;
        taskQuery = taskQuery.limit(limit).offset(offset);
      }

      // Obtener el total de registros para paginación
      const totalItems = await Task.query()
        .count('id as count')
        .modify((qb) => {
          if (status) qb.where('status', status);
          if (notification_type) qb.where('notification_type', notification_type);
          if (from_date) qb.where('notification_date', '>=', from_date);
          if (to_date) qb.where('notification_date', '<=', to_date);
        })
        .first();

      const tasks = await taskQuery.orderBy('created_at', 'desc');

      const response = {
        data: tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: parseInt(totalItems.count),
          totalPages: Math.ceil(totalItems.count / limit)
        }
      };

      if (all_data) delete response.pagination;

      return response;
    } catch (ex) {
      throw internal('Error finding tasks', ex);
    }
  }

  /**
   * Crear una nueva tarea
   * @param {Object} taskData - Datos de la tarea
   * @returns {Promise<Object>} La tarea creada
   */
  async create(taskData) {
    const { Task } = this.server.models();

    try {
      const newTask = await Task.query().insert(taskData);
      return newTask;
    } catch (ex) {
      throw internal('Error creating task', ex);
    }
  }

  /**
   * Actualizar una tarea existente
   * @param {string} id - ID de la tarea
   * @param {Object} taskData - Datos a actualizar
   * @returns {Promise<Object>} La tarea actualizada
   */
  async update(id, taskData) {
    const { Task } = this.server.models();

    try {
      const [updatedTask] = await Task.query()
        .where({ id })
        .patch({
          ...taskData,
          updated_at: new Date()
        })
        .returning('*');

      if (!updatedTask) {
        throw notFound(`Task with ID ${id} not found`);
      }

      return updatedTask;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error updating task: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Eliminar una tarea
   * @param {string} id - ID de la tarea
   * @returns {Promise<boolean>} true si la eliminación fue exitosa
   */
  async delete(id) {
    const { Task } = this.server.models();

    try {
      const deleted = await Task.query().deleteById(id);

      if (!deleted) {
        throw notFound(`Task with ID ${id} not found`);
      }

      return true;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error deleting task: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Obtener tareas por estado
   * @param {string} status - Estado de las tareas
   * @returns {Promise<Array>} Lista de tareas
   */
  async getTasksByStatus(status) {
    const { Task } = this.server.models();

    try {
      const tasks = await Task.query().where('status', status).orderBy('notificationDate', 'asc');

      return tasks;
    } catch (ex) {
      throw internal(`Error getting tasks with status: ${status}`, ex);
    }
  }

  /**
   * Obtener tareas programadas para hoy
   * @returns {Promise<Array>} Lista de tareas
   */
  async getTasksDueToday() {
    const { Task } = this.server.models();
    const today = new Date().toISOString().split('T')[0];

    try {
      const tasks = await Task.query()
        .where('notification_date', today)
        .where('status', 'created')
        .orderBy('actity_time', 'asc');

      return tasks;
    } catch (ex) {
      throw internal('Error getting tasks due today', ex);
    }
  }

  /**
   * Obtener tareas pendientes para una hora y fecha específicas
   * @param {string} hour - Hora en formato HH:MM
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {string} status - Estado de las tareas (default: 'created')
   * @returns {Promise<Array>} Lista de tareas
   */
  async getTasksPending(hour, date, status = 'created') {
    const { Task } = this.server.models();

    try {
      const tasks = await Task.query()
        .where('notification_date', date)
        .where('actity_time', hour)
        .where('status', status);

      return tasks;
    } catch (ex) {
      throw internal('Error getting pending tasks', ex);
    }
  }

  /**
   * Procesar una tarea para envío
   * @param {string} id - ID de la tarea
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processTask(id) {
    const { Task } = this.server.models();
    const { notificationTemplatesService, notificationLogsService, notificationsService } = this.server.services();

    try {
      const task = await this.findOne(id);

      // Obtener plantilla según el tipo de notificación
      const template = await notificationTemplatesService.findByType(task.notification_type);

      if (!template) {
        throw badRequest(`No template found for notification type: ${task.notification_type}`);
      }

      // Lista de usuarios a notificar
      let userManagerArray = [];
      try {
        userManagerArray = JSON.parse(task.userManager);
      } catch (e) {
        // Si no es un JSON, asumimos que es un solo ID
        userManagerArray = [task.userManager];
      }

      // Procesar el envío usando el servicio de notificaciones existente
      // Este método deberá adaptarse según tu sistema actual
      const result = await this._sendNotification(task, template, userManagerArray);

      // Registrar el log
      await notificationLogsService.create({
        task_id: task.id,
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        recipients: userManagerArray,
        subject: result.subject,
        body: result.body
      });

      // Actualizar el estado de la tarea
      await this.update(id, { status: 'completed' });

      return result;
    } catch (ex) {
      throw internal(`Error processing task: ${id}`, ex);
    }
  }

  /**
   * Obtener las ultimas tareas con base en horas especificas
   * @param {number} hours - Cantidad
   * @param {number} limit - Cantidad
   * @param {object} options - Espeficiamos parametros adicionales para las consultas como filtros
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async getByHours(hours = 24, limit = 1000, options = {}) {
    const { Task } = this.server.models();

    try {
      const tasks = Task.query()
        .where('updated_at', '>=', Task.raw(`now() - (? * '1 HOUR'::INTERVAL)`, [hours]))
        .where('updated_at', '<=', Task.raw('now()'));
      if (options?.filter?.status) {
        tasks.whereIn('status', options.filter.status.split(','));
      }

      if (options?.select) {
        tasks.select(...options?.select);
      }

      tasks.orderBy('updated_at', 'desc');
      tasks.limit(limit);
      return await tasks;
    } catch (ex) {
      throw internal(`Error in get tasks in ${hours} hours`, ex);
    }
  }

  /**
   * Elimina las ultimas tareas con base en horas especificas
   * @param {number} hours - Cantidad
   * @param {number} limit - Cantidad
   * @param {object} options - Espeficiamos parametros adicionales para las consultas como filtros
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async deleteByHours(hours = 24, limit = 1000, options = {}) {
    const { Task } = this.server.models();
    try {
      options.select = ['id'];
      const tasks = await this.getByHours(hours, limit, options);
      const taskIds = tasks.map((i) => i.id);
      const removedTasksCount = await Task.query().whereIn('id', taskIds).del();
      return removedTasksCount;
    } catch (ex) {
      throw internal(`Error in delete tasks in ${hours} hours`, ex);
    }
  }

  /**
   * Método interno para enviar notificaciones
   * @private
   */
  async _sendNotification(task, template, recipients) {
    const { notificationsService } = this.server.services();

    try {
      // Aquí invocamos los métodos del servicio de notificaciones existente
      // Dependiendo del tipo de notificación y la estructura del sistema

      // Por ejemplo, podríamos usar:
      // Para documentos: await notificationsService.documentNotification(...)
      // Para solicitudes: await notificationsService.requestNotification(...)

      // Como no tenemos estos métodos específicos, usamos el que más se aproxime
      // a lo que necesitamos

      // NOTA: Este es un ejemplo y deberá adaptarse según tu implementación exacta
      const subject = this._fillTemplate(template.subject_template, task);
      const body = this._fillTemplate(template.body_template, task);

      // Por ahora, usaremos el método welcomeEmail como ejemplo
      // pero esto debe ajustarse según los métodos disponibles en tu servicio
      for (const recipient of recipients) {
        await notificationsService.welcomeEmail(task.name, recipient);
      }

      return {
        success: true,
        subject,
        body
      };
    } catch (ex) {
      console.error('Error sending notification:', ex);
      return {
        success: false,
        error: ex.message
      };
    }
  }

  /**
   * Método para rellenar una plantilla con datos de la tarea
   * @private
   */
  _fillTemplate(template, task) {
    return template
      .replace(/\{\{task_name\}\}/g, task.name)
      .replace(/\{\{task_description\}\}/g, task.description || '')
      .replace(/\{\{notification_date\}\}/g, task.notificationDate)
      .replace(/\{\{document_name\}\}/g, task.name) // Para compatibilidad con plantillas de documentos
      .replace(/\{\{request_name\}\}/g, task.name); // Para compatibilidad con plantillas de solicitudes
  }
};
