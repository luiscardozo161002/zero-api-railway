'use strict';

const Joi = require('joi');
const { Model } = require('./helpers');

module.exports = class Company extends Model {
  static get tableName() {
    return 'companies';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().optional(),
      tradename: Joi.string().required(),
      fiscal_name_company: Joi.string().required(),
      tax_ref: Joi.string().required(),
      legal_representative: Joi.string().allow(null, ''),
      comp_legal_representative_last_name: Joi.string().allow(null, ''),
      comp_legal_representative_last_name2: Joi.string().allow(null, ''),
      email_legal_representative: Joi.string().email().allow(null, ''),
      fiscal_address: Joi.string().allow(null, ''),
      act_number: Joi.string().allow(null, ''),
      email_notifications: Joi.string().email().allow(null, ''),
      date_act_number: Joi.date().allow(null, ''),
      notary_name: Joi.string().allow(null, ''),
      notary_last_name: Joi.string().allow(null, ''),
      notary_last_name2: Joi.string().allow(null, ''),
      authorized_notaries: Joi.string().allow(null, ''),
      notary_city: Joi.string().allow(null, ''),
      notary_state: Joi.string().allow(null, ''),
      acronym: Joi.string().allow(null, ''),
      is_active: Joi.boolean().default(true),
      date_letters: Joi.string().allow(null, ''),

      created_at: Joi.date().default(() => new Date()),
      updated_at: Joi.date().default(() => new Date()),
      deleted_at: Joi.date().allow(null, ''),

      organization_id: Joi.number().integer().required()
    });
  }

  static get publicSchema() {
    return Joi.object({
      id: this.field('id'),
      tradename: this.field('tradename'),
      fiscal_name_company: this.field('fiscal_name_company'),
      tax_ref: this.field('tax_ref'),
      legal_representative: this.field('legal_representative'),
      comp_legal_representative_last_name: this.field('comp_legal_representative_last_name'),
      comp_legal_representative_last_name2: this.field('comp_legal_representative_last_name2'),
      email_legal_representative: this.field('email_legal_representative'),
      fiscal_address: this.field('fiscal_address'),
      act_number: this.field('act_number'),
      email_notifications: this.field('email_notifications'),
      date_act_number: this.field('date_act_number'),
      notary_name: this.field('notary_name'),
      notary_last_name: this.field('notary_last_name'),
      notary_last_name2: this.field('notary_last_name2'),
      authorized_notaries: this.field('authorized_notaries'),
      notary_city: this.field('notary_city'),
      notary_state: this.field('notary_state'),
      acronym: this.field('acronym'),
      is_active: this.field('is_active'),
      date_letters: this.field('date_letters'),
      organization_id: this.field('organization_id'),
      created_at: this.field('created_at'),
      updated_at: this.field('updated_at')
    }).options({ stripUnknown: true });
  }

  static get patchSchema() {
    return Joi.object({
      tradename: this.field('tradename').optional(),
      fiscal_name_company: this.field('fiscal_name_company').optional(),
      tax_ref: this.field('tax_ref').optional(),
      legal_representative: this.field('legal_representative').optional(),
      comp_legal_representative_last_name: this.field('comp_legal_representative_last_name').optional(),
      comp_legal_representative_last_name2: this.field('comp_legal_representative_last_name2').optional(),
      email_legal_representative: this.field('email_legal_representative').optional(),
      fiscal_address: this.field('fiscal_address').optional(),
      act_number: this.field('act_number').optional(),
      email_notifications: this.field('email_notifications').optional(),
      date_act_number: this.field('date_act_number').optional(),
      notary_name: this.field('notary_name').optional(),
      notary_last_name: this.field('notary_last_name').optional(),
      notary_last_name2: this.field('notary_last_name2').optional(),
      authorized_notaries: this.field('authorized_notaries').optional(),
      notary_city: this.field('notary_city').optional(),
      notary_state: this.field('notary_state').optional(),
      acronym: this.field('acronym').optional(),
      is_active: this.field('is_active').optional(),
      date_letters: this.field('date_letters').optional(),
      organization_id: this.field('organization_id').optional()
    }).options({ stripUnknown: true });
  }

  static relationMappings() {
    const Organization = require('./organization');

    return {
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: 'companies.organization_id',
          to: 'organizations.id'
        }
      }
    };
  }
};
