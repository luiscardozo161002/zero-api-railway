'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { badRequest, internal } = require('@hapi/boom');

const notes = `Create a new row registry`;

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/logs',
  options: {
    tags: ['api', 'logs'],
    description: 'Create a new row registry',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      scope: ['admin']
    },
    validate: {
      payload: Joi.object({
        level: Joi.string().valid('info', 'warning', 'error', 'debug').required().example('info'),
        message: Joi.string().required().example('Usuario creado correctamente'),
        source: Joi.string().max(100).required().example('users.create'),
        destination: Joi.string().valid('db', 'file', 'both').default('db').example('db'),
        user_id: Joi.string().uuid().optional().example('f66c0392-417f-42af-bdcb-dadedac64290'),   
        ip_address: Joi.string().max(50).optional().example('192.168.1.1'),
        request_data: Joi.object().optional().example({ email: 'usuario@ejemplo.com' }),
        request_detail: Joi.object({
          request_id: Joi.number().integer().allow(null).optional().example(456),
          request_folio: Joi.string().allow(null, '').optional().example('DOC-2025-001'),
          type: Joi.string().valid('transit', 'document', 'sign', 'comment').allow(null).optional().example('document'),
          start_state: Joi.string().allow(null, '').optional().example('pending'),
          next_stage: Joi.string().allow(null, '').optional().example('approved'),
          doc_anexo_name: Joi.string().allow(null, '').optional().example('contrato.pdf'),
          upload_date: Joi.date().allow(null).optional().example('2025-09-16T10:00:00Z'),
          delete_date: Joi.date().allow(null).optional(),
          approved_date: Joi.date().allow(null).optional().example('2025-09-16T14:30:00Z'),
          comment_date: Joi.date().allow(null).optional(),
          comment: Joi.string().allow(null, '').optional().example('Documento aprobado sin observaciones'),
          sign_date: Joi.date().allow(null).optional(),
          signer_name: Joi.string().allow(null, '').optional().example('Juan Pérez')
        }).allow(null).optional().example({
          request_id: 456,
          request_folio: 'DOC-2025-001',
          type: 'document',
          start_state: 'pending',
          next_stage: 'approved',
          doc_anexo_name: 'contrato.pdf',
          upload_date: '2025-09-16T10:00:00Z',
          approved_date: '2025-09-16T14:30:00Z',
          comment: 'Documento aprobado sin observaciones',
          signer_name: 'Juan Pérez'
        }),
        stack_trace: Joi.string().optional().example('Error: Error de procesamiento\n    at processPayment...')
      }).options({ stripUnknown: true })
    },
    response: {
      status: {
        201: Joi.object({
          statusCode: Joi.number().required().example(201),
          message: Joi.string().required().example('Log creado correctamente'),
          data: Joi.object({
            id: Joi.number().integer().required(),
            level: Joi.string().required(),
            message: Joi.string().required(),
            source: Joi.string().allow(null, ''),
            request_detail: Joi.object().allow(null).optional(),
            created_at: Joi.date().required()
          }).unknown(true)
        }).label('Created'),
        400: Helpers.HTTP_400,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    handler: async (request, h) => {
      try {
        const { payload } = request;
        const { logsService } = request.services();
        const insidePayload = request.auth.artifacts.decoded.payload;
        const organizationId = insidePayload.organization_id;
        
        if (!organizationId) {
          throw badRequest('Se requiere ID de organización');
        }

        const metadata = {
          ip_address: payload.ip_address,
          request_data: payload.request_data,
          request_detail: payload.request_detail,
          stack_trace: payload.stack_trace
        };
        
        const createdLog = await logsService.createLog({
          destination: payload.destination,
          level: payload.level,
          message: payload.message,
          source: payload.source,
          organizationId,
          userId: payload.user_id,
          metadata
        });
        
        return h.response({
          statusCode: 201,
          message: 'Log creado correctamente',
          data: createdLog
        }).code(201);
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'Ocurrió un error', error);
      }
    }
  }
});