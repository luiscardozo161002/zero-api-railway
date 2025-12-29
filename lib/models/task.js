'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Task extends Model {
  static get tableName() {
    return 'tasks';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.string().uuid(),
      request_id: Joi.string().uuid().allow(null, ''),
      name: Joi.string().required(),
      description: Joi.string().allow(null, ''),
      end_date: Joi.date().allow(null, ''),
      number_period: Joi.string().allow(null, ''),
      select_period: Joi.string().default('dias'),
      actity_time: Joi.string().default('09:00'),
      notification_date: Joi.date().required(),
      userManager: Joi.string().required(), // Lista de usuarios (formato JSON)
      metadata_request: Joi.object().allow(null, ''),
      status: Joi.string().default('created'),
      created_by: Joi.string().uuid().required(),
      created_at: Joi.date().default(() => new Date()),
      updated_by: Joi.string().uuid().allow(null, ''),
      updated_at: Joi.date().default(() => new Date()),
      start_date: Joi.date().default(() => new Date()),
      notification_type: Joi.string().required(), // 'document', 'request', 'task'
      company_id: Joi.number().integer().allow(null),
      notification_type_id: Joi.string().allow(null, '')
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      request_id: this.field('request_id'),
      name: this.field('name'),
      description: this.field('description'),
      end_date: this.field('end_date'),
      number_period: this.field('number_period'),
      select_period: this.field('select_period'),
      actity_time: this.field('actity_time'),
      notification_date: this.field('notification_date'),
      userManager: this.field('userManager'),
      metadata_request: this.field('metadata_request'),
      status: this.field('status'),
      created_by: this.field('created_by'),
      created_at: this.field('created_at'),
      updated_by: this.field('updated_by'),
      updated_at: this.field('updated_at'),
      start_date: this.field('start_date'),
      notification_type: this.field('notification_type'),
      company_id: this.field('company_id'),
      notification_type_id: this.field('notification_type_id')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      name: this.field('name').optional(),
      request_id: this.field('request_id').optional(),
      description: this.field('description').optional(),
      end_date: this.field('end_date').optional(),
      number_period: this.field('number_period').optional(),
      select_period: this.field('select_period').optional(),
      actity_time: this.field('actity_time').optional(),
      notification_date: this.field('notification_date').optional(),
      userManager: this.field('userManager').optional(),
      metadata_request: this.field('metadata_request').optional(),
      status: this.field('status').optional(),
      updated_by: this.field('updated_by').optional(),
      updated_at: Joi.date().default(() => new Date()),
      notification_type: this.field('notification_type').optional(),
      company_id: this.field('company_id').optional(),
      notification_type_id: this.field('notification_type_id').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const NotificationLog = require('./notification-log');
    const User = require('./user');
    const Company = require('./company');

    return {
      logs: {
        relation: Model.HasManyRelation,
        modelClass: NotificationLog,
        join: {
          from: 'tasks.id',
          to: 'notification_logs.task_id'
        }
      },
      company: {
        relation: Model.BelongsToOneRelation,
        modelClass: Company,
        join: {
          from: 'tasks.company_id',
          to: 'companies.id'
        }
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.created_by',
          to: 'users.id'
        }
      },
      modifier: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.updated_by',
          to: 'users.id'
        }
      }
    };
  }
};
