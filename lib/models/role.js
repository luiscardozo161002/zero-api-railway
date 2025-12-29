'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Role extends Model {
  static get tableName() {
    return 'roles';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.string(),
      name: Joi.string().required(),
      description: Joi.string().allow(null, ''),
      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date())
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      name: this.field('name'),
      description: this.field('description'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      name: this.field('name').optional(),
      description: this.field('description').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const User = require('./user');

    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'roles.id',
          to: 'users.role_id'
        }
      }
    };
  }
};
