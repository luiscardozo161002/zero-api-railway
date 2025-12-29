'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Log extends Model {
  static get tableName() {
    return 'logs';
  }

  static get requestDetailSchema() {
    return Joi.object({
      request_id: Joi.number().integer().allow(null).optional(),
      request_folio: Joi.string().allow(null, '').optional(),
      type: Joi.string().valid('transit', 'document', 'sign', 'comment').allow(null).optional(),
      start_state: Joi.string().allow(null, '').optional(),
      next_stage: Joi.string().allow(null, '').optional(),
      doc_anexo_name: Joi.string().allow(null, '').optional(),
      upload_date: Joi.date().allow(null).optional(),
      delete_date: Joi.date().allow(null).optional(),
      approved_date: Joi.date().allow(null).optional(),
      comment_date: Joi.date().allow(null).optional(),
      comment: Joi.string().allow(null, '').optional(),
      sign_date: Joi.date().allow(null).optional(),
      signer_name: Joi.string().allow(null, '').optional()
    }).allow(null);
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().optional(),
      organization_id: Joi.number().integer().required(),
      level: Joi.string().valid('info', 'warning', 'error', 'debug').required(),
      message: Joi.string().required(),
      source: Joi.string().max(100).allow(null, ''),
      user_id: Joi.string().uuid().allow(null),
      ip_address: Joi.string().max(50).allow(null, ''),
      request_data: Joi.object().allow(null),
      request_detail: this.requestDetailSchema,
      stack_trace: Joi.string().allow(null, ''),
      created_at: Joi.date().default(() => new Date())
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      organization_id: this.field('organization_id'),
      level: this.field('level'),
      message: this.field('message'),
      source: this.field('source'),
      user_id: this.field('user_id'),
      ip_address: this.field('ip_address').optional(),
      request_data: this.field('request_data').optional(),
      request_detail: this.field('request_detail').optional(),
      stack_trace: this.field('stack_trace').optional(),
      created_at: this.field('created_at')
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const User = require('./user');
    const Organization = require('./organization');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'logs.user_id',
          to: 'users.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'logs.organization_id',
          to: 'organizations.id'
        }
      }
    };
  }
};