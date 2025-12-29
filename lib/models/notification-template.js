'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class NotificationTemplate extends Model {
  static get tableName() {
    return 'notification_templates';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      template_name: Joi.string().required(),
      notification_type: Joi.string().required(), // 'document', 'request', 'task'
      subject_template: Joi.string().required(),
      body_template: Joi.string().required(),
      active: Joi.boolean().default(true),
      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date())
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      template_name: this.field('template_name'),
      notification_type: this.field('notification_type'),
      subject_template: this.field('subject_template'),
      body_template: this.field('body_template'),
      active: this.field('active'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      template_name: this.field('template_name').optional(),
      notification_type: this.field('notification_type').optional(),
      subject_template: this.field('subject_template').optional(),
      body_template: this.field('body_template').optional(),
      active: this.field('active').optional(),
      updated_at: Joi.date().default(() => new Date())
    }).options({ stripUnknown: true });
  }

  // No necesita relaciones específicas, pero se podría añadir si fuera necesario
  static relationMappings() {
    return {};
  }
};