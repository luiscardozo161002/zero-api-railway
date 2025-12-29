'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class NotificationLog extends Model {
  static get tableName() {
    return 'notification_logs';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      task_id: Joi.string().uuid().required(),
      sent_at: Joi.date().default(() => new Date()),
      status: Joi.string().required(),
      error_message: Joi.string().allow(null, ''),
      recipients: Joi.object().allow(null),
      subject: Joi.string().allow(null, ''),
      body: Joi.string().allow(null, '')
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      task_id: this.field('task_id'),
      sent_at: this.field('sent_at'),
      status: this.field('status'),
      error_message: this.field('error_message'),
      recipients: this.field('recipients'),
      subject: this.field('subject'),
      body: this.field('body')
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const Task = require('./task');

    return {
      task: {
        relation: Model.BelongsToOneRelation,
        modelClass: Task,
        join: {
          from: 'notification_logs.task_id',
          to: 'tasks.id'
        }
      }
    };
  }
};