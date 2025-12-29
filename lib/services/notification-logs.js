'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal, notFound, isBoom } = require('@hapi/boom');

module.exports = class NotificationLogsService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   * Crear un nuevo registro de log
   * @param {Object} logData - Datos del log
   * @returns {Promise<Object>} El log creado
   */
  async create(logData) {
    const { NotificationLog } = this.server.models();

    try {
      const newLog = await NotificationLog.query().insert(logData);
      return newLog;
    } catch (ex) {
      throw internal('Error creating notification log', ex);
    }
  }

  /**
   * Obtener logs por ID de tarea
   * @param {string} taskId - ID de la tarea
   * @returns {Promise<Array>} Lista de logs
   */
  async findByTaskId(taskId) {
    const { NotificationLog } = this.server.models();

    try {
      const logs = await NotificationLog.query()
        .where('task_id', taskId)
        .orderBy('sent_at', 'desc');

      return logs;
    } catch (ex) {
      throw internal(`Error finding logs for task: ${taskId}`, ex);
    }
  }

  /**
   * Obtener logs recientes
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object>} Lista de logs con paginación
   */
  async findRecentLogs(options = {}) {
    const { NotificationLog, Task } = this.server.models();
    const { 
      task_id, 
      status, 
      from_date, 
      to_date,
      page = 1,
      limit = 10
    } = options;

    try {
      let query = NotificationLog.query()
        .select('notification_logs.*', 'tasks.name as task_name', 'tasks.notification_type')
        .leftJoin('tasks', 'notification_logs.task_id', 'tasks.id');

      // Aplicar filtros si están presentes
      if (task_id) {
        query = query.where('notification_logs.task_id', task_id);
      }

      if (status) {
        query = query.where('notification_logs.status', status);
      }

      if (from_date) {
        query = query.where('notification_logs.sent_at', '>=', from_date);
      }

      if (to_date) {
        query = query.where('notification_logs.sent_at', '<=', to_date);
      }

      // Aplicar paginación
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);

      // Obtener el total de registros para paginación
      const totalItems = await NotificationLog.query()
        .count('id as count')
        .modify(qb => {
          if (task_id) qb.where('task_id', task_id);
          if (status) qb.where('status', status);
          if (from_date) qb.where('sent_at', '>=', from_date);
          if (to_date) qb.where('sent_at', '<=', to_date);
        })
        .first();

      const logs = await query.orderBy('notification_logs.sent_at', 'desc');

      return {
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: parseInt(totalItems.count),
          totalPages: Math.ceil(totalItems.count / limit)
        }
      };
    } catch (ex) {
      throw internal('Error finding notification logs', ex);
    }
  }

  /**
   * Obtener estadísticas de envíos
   * @returns {Promise<Object>} Estadísticas
   */
  async getStats() {
    const { NotificationLog, Task } = this.server.models();
    const knex = NotificationLog.knex();

    try {
      // Total de notificaciones enviadas
      const totalSent = await NotificationLog.query()
        .count('id as count')
        .first();

      // Notificaciones exitosas vs fallidas
      const statusCounts = await NotificationLog.query()
        .select('status')
        .count('id as count')
        .groupBy('status');

      // Obtener conteo por tipo de notificación
      const byType = await NotificationLog.query()
        .select('tasks.notification_type')
        .count('notification_logs.id as count')
        .leftJoin('tasks', 'notification_logs.task_id', 'tasks.id')
        .groupBy('tasks.notification_type');

      // Conteo por día (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const byDay = await knex.raw(`
        SELECT 
          to_char(sent_at, 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM notification_logs
        WHERE sent_at >= ?
        GROUP BY to_char(sent_at, 'YYYY-MM-DD')
        ORDER BY date
      `, [sevenDaysAgo.toISOString()]);

      // Preparar el objeto de respuesta
      const stats = {
        totalSent: parseInt(totalSent.count),
        successful: 0,
        failed: 0,
        byType: {},
        byDay: byDay.rows
      };

      // Procesar conteos por estado
      statusCounts.forEach(item => {
        if (item.status === 'success') {
          stats.successful = parseInt(item.count);
        } else if (item.status === 'failed') {
          stats.failed = parseInt(item.count);
        }
      });

      // Procesar conteos por tipo
      byType.forEach(item => {
        stats.byType[item.notification_type] = parseInt(item.count);
      });

      return stats;
    } catch (ex) {
      throw internal('Error getting notification statistics', ex);
    }
  }
};