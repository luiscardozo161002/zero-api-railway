'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal, badRequest, notFound, isBoom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

module.exports = class LogsService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  async createLog({ destination = 'db', level, message, source, organizationId, userId, metadata = {} }) {
    const { Log } = this.server.models();

    try {
      
      const ip_address = metadata.ip_address || null;
      const request_data = metadata.request_data || null;

      const request_detail = metadata.request_detail || null;
      const stack_trace = metadata.stack_trace || null;

      if (destination === 'db' || destination === 'both') {
        const logData = {
          organization_id: organizationId,
          level,
          message,
          source,
          //user_id: userId || null,
          user_id: userId ?? null,
          ip_address,
          request_data,
          request_detail,
          stack_trace
        };

        const createdLog = await Log.query().insert(logData);
        return createdLog;
      }

      if (destination === 'file' || destination === 'both') {
        const logDir = path.join(process.cwd(), 'logs');

        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        const logDate = new Date();
        const fileName = path.join(
          logDir,
          `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}-${logDate
            .getDate()
            .toString()
            .padStart(2, '0')}.log`
        );

        const logEntry =
          JSON.stringify({
            timestamp: logDate.toISOString(),
            level,
            message,
            source,
            organization_id: organizationId,
            user_id: userId,
            ip_address,
            request_detail,
            ...metadata
          }) + '\n';

        fs.appendFileSync(fileName, logEntry);
      }

      return { success: true };
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal('Error creating log', ex);
      }

      throw ex;
    }
  }

  async findAllLogs({ organizationId, filters = {}, pagination = {}, id, messageQuery }) {
    const { Log } = this.server.models();
    const { page = 1, limit = 25 } = pagination;

    try {
      if (id) {
        const log = await Log.query().findById(id).where('organization_id', organizationId);

        if (!log) {
          throw notFound(`Log with ID ${id} not found`);
        }

        return log; 
      }


      const baseQuery = Log.query().where('organization_id', organizationId);

      if (messageQuery) {
        baseQuery.where('message', 'like', `%${messageQuery}%`);
      }

      if (filters.level) {
        baseQuery.where('level', filters.level);
      }

      if (filters.source) {
        baseQuery.where('source', 'like', `%${filters.source}%`);
      }

      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        baseQuery.where('created_at', '>=', dateFrom);
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        baseQuery.where('created_at', '<=', dateTo);
      }

      if (filters.userId) {
        baseQuery.where('user_id', filters.userId);
      }

      const total = await baseQuery.clone().resultSize();

      const results = await baseQuery
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalItems: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal('Error finding logs', ex);
      }

      throw ex;
    }
  }

};
