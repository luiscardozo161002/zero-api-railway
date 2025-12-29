'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.string().uuid().optional(), 
      email: Joi.string().email().required(),
      password_hash: Joi.string().required(),
      username: Joi.string().token().allow(null, ''),
      full_name: Joi.string().required(),
      phone: Joi.string().allow(null, ''),
      area: Joi.string().allow(null, ''),
      area_id: Joi.number().integer().allow(null),
      organization_id: Joi.number().integer().required(),
      deleted_at: Joi.date().allow(null, ''),
      role_id: Joi.number().integer().allow(null),
      is_deleted: Joi.boolean().default(false),
      is_active: Joi.boolean().default(true),
      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date())
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      email: this.field('email').optional(),
      full_name: this.field('full_name').optional(),
      phone: this.field('phone').optional(),
      area: this.field('area').optional(),
      area_id: this.field('area_id').optional(),
      organization_id: this.field('organization_id'),
      role_id: this.field('role_id'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at'),
      deleted_at: this.field('deleted_at'),
      is_active: this.field('is_active'),
      is_deleted: this.field('is_deleted')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      full_name: this.field('full_name').optional(),
      email: this.field('email').optional(),
      phone: this.field('phone').optional(),
      area: this.field('area').optional(),
      area_id: this.field('area_id').optional(),
      organization_id: this.field('organization_id').optional(),
      role_id: this.field('role_id').optional(),
      password_hash: Joi.string().example('passexample').optional(),
      is_active: this.field('is_active').optional(),
      is_deleted: this.field('is_deleted').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const Role = require('./role');
    const Organization = require('./organization');

    return {
      role: {
        relation: Model.BelongsToOneRelation,
        modelClass: Role,
        join: {
          from: 'users.role_id',
          to: 'roles.id'
        }
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'users.organization_id',
          to: 'organizations.id'
        }
      }
    };
  }

  static byOrganization(builder, organizationId) {
    builder.where('organization_id', organizationId);
    return builder;
  }
};