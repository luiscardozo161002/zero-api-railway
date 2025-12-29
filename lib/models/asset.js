'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Asset extends Model {
  static get tableName() {
    return 'assets';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().optional(),
      name: Joi.string().required(),
      mime_type: Joi.string().required(),
      size: Joi.number().integer().required(),
      type: Joi.string().valid('logo', 'avatar').required(),
      data: Joi.binary().required(),
      deleted_at: Joi.date().allow(null, ''),
      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date())
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      name: this.field('name'),
      mime_type: this.field('mime_type'),
      size: this.field('size'),
      type: this.field('type'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      name: this.field('name').optional(),
      mime_type: this.field('mime_type').optional(),
      size: this.field('size').optional(),
      type: this.field('type').optional(),
      data: this.field('data').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    // Si en el futuro relacionas assets con otra tabla, puedes agregarla aquí
    return {};
  }
};
