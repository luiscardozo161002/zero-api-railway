'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal, badRequest, notFound, isBoom } = require('@hapi/boom');

module.exports = class NotificationTemplatesService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   * Encontrar una plantilla por ID
   * @param {number} id - El ID de la plantilla
   * @returns {Promise<Object>} La plantilla encontrada
   */
  async findOne(id) {
    const { NotificationTemplate } = this.server.models();

    try {
      const template = await NotificationTemplate.query().findOne({ id });

      if (!template) {
        throw notFound(`Template with ID ${id} not found`);
      }

      return template;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error getting template: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Obtener todas las plantillas
   * @returns {Promise<Array>} Lista de plantillas
   */
  async findAll() {
    const { NotificationTemplate } = this.server.models();

    try {
      const templates = await NotificationTemplate.query().orderBy('template_name');

      return templates;
    } catch (ex) {
      throw internal('Error finding templates', ex);
    }
  }

  /**
   * Buscar plantillas por tipo de notificación
   * @param {string} type - Tipo de notificación ('document', 'request', 'task')
   * @returns {Promise<Object>} La plantilla encontrada
   */
  async findByType(type) {
    const { NotificationTemplate } = this.server.models();

    try {
      const template = await NotificationTemplate.query()
        .where('notification_type', type)
        .where('active', true)
        .first();

      if (!template) {
        throw notFound(`No active template found for type: ${type}`);
      }

      return template;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error finding template for type: ${type}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Crear una nueva plantilla
   * @param {Object} templateData - Datos de la plantilla
   * @returns {Promise<Object>} La plantilla creada
   */
  async create(templateData) {
    const { NotificationTemplate } = this.server.models();

    try {
      // Verificar si ya existe una plantilla con el mismo nombre
      const existing = await NotificationTemplate.query().where('template_name', templateData.template_name).first();

      if (existing) {
        throw badRequest(`Template with name '${templateData.template_name}' already exists`);
      }

      const newTemplate = await NotificationTemplate.query().insert(templateData);
      return newTemplate;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal('Error creating template', ex);
      }

      throw ex;
    }
  }

  /**
   * Actualizar una plantilla existente
   * @param {number} id - ID de la plantilla
   * @param {Object} templateData - Datos a actualizar
   * @returns {Promise<Object>} La plantilla actualizada
   */
  async update(id, templateData) {
    const { NotificationTemplate } = this.server.models();

    try {
      // Verificar si estamos intentando actualizar el nombre y ya existe otra plantilla con ese nombre
      if (templateData.template_name) {
        const existing = await NotificationTemplate.query()
          .where('template_name', templateData.template_name)
          .whereNot('id', id)
          .first();

        if (existing) {
          throw badRequest(`Template with name '${templateData.template_name}' already exists`);
        }
      }

      const [updatedTemplate] = await NotificationTemplate.query()
        .where({ id })
        .patch({
          ...templateData,
          updated_at: new Date()
        })
        .returning('*');

      if (!updatedTemplate) {
        throw notFound(`Template with ID ${id} not found`);
      }

      return updatedTemplate;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error updating template: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Eliminar una plantilla
   * @param {number} id - ID de la plantilla
   * @returns {Promise<boolean>} true si la eliminación fue exitosa
   */
  async delete(id) {
    const { NotificationTemplate } = this.server.models();

    try {
      const deleted = await NotificationTemplate.query().deleteById(id);

      if (!deleted) {
        throw notFound(`Template with ID ${id} not found`);
      }

      return true;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error deleting template: ${id}`, ex);
      }

      throw ex;
    }
  }

  /**
   * Obtener la plantilla predeterminada para un tipo de notificación
   * Si no existe, la crea
   * @param {string} type - Tipo de notificación ('document', 'request', 'task')
   * @returns {Promise<Object>} La plantilla predeterminada
   */
  async getDefaultTemplate(type) {
    try {
      // Intentar encontrar una plantilla existente
      try {
        const template = await this.findByType(type);
        return template;
      } catch (ex) {
        if (!ex.isBoom || ex.output.statusCode !== 404) {
          throw ex;
        }

        // No se encontró, crear una plantilla predeterminada
        const defaultTemplate = {
          template_name: `Default ${type} template`,
          notification_type: type,
          active: true
        };

        switch (type) {
          case 'document':
            defaultTemplate.subject_template = 'Recordatorio: Documento {{document_name}} a punto de vencer';
            defaultTemplate.body_template =
              'El documento {{document_name}} vencerá pronto. Por favor revisa la información.';
            break;
          case 'request':
            defaultTemplate.subject_template = 'Recordatorio: Solicitud {{request_name}} a punto de vencer';
            defaultTemplate.body_template =
              'La solicitud {{request_name}} vencerá pronto. Por favor revisa la información.';
            break;
          case 'task':
            defaultTemplate.subject_template = 'Recordatorio: Tarea {{task_name}}';
            defaultTemplate.body_template =
              'Tienes una tarea pendiente: {{task_name}}. Descripción: {{task_description}}';
            break;
          default:
            defaultTemplate.subject_template = 'Recordatorio de sistema';
            defaultTemplate.body_template = 'Tienes una notificación pendiente.';
        }

        return await this.create(defaultTemplate);
      }
    } catch (ex) {
      throw internal(`Error getting default template for type: ${type}`, ex);
    }
  }
};
