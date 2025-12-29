//'use strict';
//
//const { isBoom } = require('@hapi/boom');
//
///**
// * Plugin para gestión de logs en la aplicación
// */
//module.exports = {
//  name: 'logger',
//
//  register(server, options = {}) {
//    // Configuración por defecto
//    const settings = {
//      skipPaths: options.skipPaths || ['/logs', '/health', '/documentation', '/zeroclm-api'],
//      defaultOrganizationId: options.defaultOrganizationId || 1
//    };
//
//    // Funciones de logger para diferentes niveles
//    const loggerMethods = {
//      info: (destination, message, source, metadata = {}) => {
//        return logMessage(server, 'info', destination, message, source, metadata);
//      },
//      warning: (destination, message, source, metadata = {}) => {
//        return logMessage(server, 'warning', destination, message, source, metadata);
//      },
//      error: (destination, message, source, metadata = {}) => {
//        return logMessage(server, 'error', destination, message, source, metadata);
//      },
//      debug: (destination, message, source, metadata = {}) => {
//        return logMessage(server, 'debug', destination, message, source, metadata);
//      }
//    };
//
//    // Decorar servidor y requests con métodos de logger
//    server.decorate('server', 'logger', loggerMethods);
//    server.decorate('request', 'logger', loggerMethods);
//
//    // Decorar plugin para acceso directo
//    server.expose('logger', loggerMethods);
//
//    // Interceptar respuestas para logging automático de errores
//    server.ext('onPreResponse', async (request, h) => {
//      const response = request.response;
//
//      // Verificar si debemos omitir esta ruta
//      if (settings.skipPaths.some((path) => request.path.startsWith(path))) {
//        return h.continue;
//      }
//
//      // Si hay un error en la respuesta, registrarlo
//      const credentials = request.auth.credentials || {};
//      const organizationId = credentials.organization_id || settings.defaultOrganizationId;
//      if (response && response.isBoom) {
//        const error = response;
//
//        if (organizationId) {
//          try {
//            // Preparar datos para el log
//            const payload = request.payload || {};
//
//            // Registrar error
//            await logMessage(
//              server,
//              'error',
//              'db',
//              error.message || 'Error en la solicitud',
//              request.route ? request.route.path : request.path,
//              {
//                userId: credentials.id,
//                ip_address: request.info ? request.info.remoteAddress : null,
//                request_data: {
//                  method: request.method,
//                  path: request.path,
//                  payload: sanitizePayload(payload),
//                  params: request.params,
//                  query: request.query
//                },
//                stack_trace: error.stack,
//                statusCode: error.output ? error.output.statusCode : 500,
//                organizationId
//              }
//            );
//          } catch (logError) {
//            // En caso de error en el logging, registrar en consola pero no interrumpir
//            console.error('Error al registrar log:', logError);
//          }
//        }
//      } else {
//        try {
//          // Preparar datos para el log
//          const payload = request.payload || {};
//
//          // Registrar error
//          await logMessage(server, 'debug', 'db', 'Solicitud', request.route ? request.route.path : request.path, {
//            userId: credentials.id,
//            ip_address: request.info ? request.info.remoteAddress : null,
//            request_data: {
//              method: request.method,
//              path: request.path,
//              payload: sanitizePayload(payload),
//              params: request.params,
//              query: request.query
//            },
//            stack_trace: '',
//            statusCode: request.response.statusCode,
//            organizationId
//          });
//        } catch (logError) {
//          // En caso de error en el logging, registrar en consola pero no interrumpir
//          console.error('Error al registrar log:', logError);
//        }
//      }
//
//      return h.continue;
//    });
//
//    // Función auxiliar para sanear datos sensibles
//    const sanitizePayload = function (payload) {
//      if (!payload || typeof payload !== 'object') {
//        return payload;
//      }
//
//      const sanitized = { ...payload };
//
//      // Campos sensibles a redactar
//      const sensitiveFields = ['password', 'password_hash', 'token', 'credit_card', 'secret'];
//
//      sensitiveFields.forEach((field) => {
//        if (sanitized[field]) {
//          sanitized[field] = '[REDACTADO]';
//        }
//      });
//
//      return sanitized;
//    };
//
//    // Función para crear entradas de log
//    const logMessage = function (server, level, destination, message, source, metadata = {}) {
//      try {
//        // Obtener servicio de logs
//        if (!server.services) {
//          console.error('Servicios no disponibles en el servidor');
//          return null;
//        }
//
//        const services = server.services(true);
//
//        const logsService = services.logsService;
//
//        if (!logsService) {
//          console.error('LogsService no disponible');
//          return null;
//        }
//
//        // Determinar el ID de organización
//        let organizationId = metadata.organizationId;
//
//        if (!organizationId && metadata.credentials && metadata.credentials.organization_id) {
//          organizationId = metadata.credentials.organization_id;
//        }
//
//        if (!organizationId) {
//          organizationId = settings.defaultOrganizationId;
//        }
//
//        // Crear log
//        return logsService.createLog({
//          destination,
//          level,
//          message,
//          source,
//          organizationId,
//          userId: metadata.userId,
//          metadata
//        });
//      } catch (error) {
//        // Evitar ciclos infinitos de logging
//        console.error('Error al crear log:', error.message);
//        return null;
//      }
//    };
//
//    // Log para indicar que el plugin se ha inicializado correctamente
//    server.log(['info', 'plugin'], 'Plugin de logging inicializado');
//  }
//};
