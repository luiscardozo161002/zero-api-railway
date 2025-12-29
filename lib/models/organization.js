'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Organization extends Model {
  static get tableName() {
    return 'organizations';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().optional(),
      name: Joi.string().max(100).required(),
      subdomain: Joi.string()
        .max(50)
        .required()
        .pattern(/^[a-z0-9-]+$/)
        .lowercase(),
      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date()),
      deleted_at: Joi.date().allow(null, ''),
      logo_id: Joi.number().integer().allow(null),
      is_active: Joi.boolean().default(true)
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      name: this.field('name'),
      subdomain: this.field('subdomain'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at'),
      logo_id: Joi.number().integer().allow(null),
      is_active: this.field('is_active')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      name: this.field('name').optional(),
      subdomain: this.field('subdomain').optional(),
      logo_id: Joi.number().integer().allow(null),
      is_active: this.field('is_active').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const User = require('./user');
    const Log = require('./log');
    const Asset = require('./asset');

    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'organizations.id',
          to: 'users.organization_id'
        }
      },
      logo: {
        relation: Model.BelongsToOneRelation,
        modelClass: Asset,
        join: {
          from: 'organizations.logo_id',
          to: 'assets.id'
        }
      },
      logs: {
        relation: Model.HasManyRelation,
        modelClass: Log,
        join: {
          from: 'organizations.id',
          to: 'logs.organization_id'
        }
      }
    };
  }

  // Query modifiers
  static withoutDeleted(builder) {
    builder.whereNull('deleted_at');
    return builder;
  }

  static onlyActive(builder) {
    builder.where('is_active', true);
    return builder;
  }

  static findBySubdomain(builder, subdomain) {
    builder.where('subdomain', subdomain.toLowerCase());
    return builder;
  }
};
