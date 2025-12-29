'use strict';

const Schmervice = require('@hapipal/schmervice');
const Bull = require('bull');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

let schedulerInterval = null;
let serviceCheckInterval = null;

/**
 * Mock Queue para entorno sin Redis
 */
class MockQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.jobs = new Map();
    this.jobsByState = {
      waiting: new Map(),
      active: new Map(),
      completed: new Map(),
      failed: new Map()
    };
    this.processor = null;
    this.concurrency = 1;
    this.jobCounter = 0;

    console.log(`[MockQueue] Initialized queue: ${name}`);
  }

  add(data, options = {}) {
    const jobId = options.jobId || `mock-job-${++this.jobCounter}`;
    const job = {
      id: jobId,
      data,
      opts: { ...options },
      attemptsMade: 0,
      timestamp: Date.now(),
      stacktrace: [],
      finishedOn: null,
      returnvalue: null,
      state: 'waiting'
    };

    this.jobs.set(jobId, job);
    this.jobsByState.waiting.set(jobId, job);

    console.log(`[MockQueue] Job added: ${jobId}`, data);
    this.emit('waiting', job.id, job.data);

    // Programar procesamiento inmediato si hay un procesador
    if (this.processor) {
      setTimeout(() => this._processJob(job), 10);
    }

    return Promise.resolve(job);
  }

  process(concurrency, processor) {
    if (typeof concurrency === 'function') {
      this.processor = concurrency;
      this.concurrency = 1;
    } else {
      this.processor = processor;
      this.concurrency = concurrency;
    }

    console.log(`[MockQueue] Processor registered with concurrency: ${this.concurrency}`);

    // Procesar trabajos pendientes
    for (const [_, job] of this.jobsByState.waiting) {
      this._processJob(job);
    }

    return Promise.resolve();
  }

  getJob(jobId) {
    return Promise.resolve(this.jobs.get(jobId) || null);
  }

  getJobs(types, start = 0, end = 15, asc = false) {
    const typesList = Array.isArray(types) ? types : [types];
    let result = [];

    typesList.forEach((type) => {
      if (this.jobsByState[type]) {
        const jobs = Array.from(this.jobsByState[type].values());
        result = result.concat(jobs);
      }
    });

    // Ordenar por timestamp
    result.sort((a, b) => {
      return asc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    });

    return Promise.resolve(result.slice(start, end));
  }

  getJobCounts() {
    return Promise.resolve({
      waiting: this.jobsByState.waiting.size,
      active: this.jobsByState.active.size,
      completed: this.jobsByState.completed.size,
      failed: this.jobsByState.failed.size,
      delayed: 0,
      paused: 0
    });
  }

  clean(grace = 0, status = 'completed', limit = 1000) {
    if (!this.jobsByState[status]) {
      return Promise.resolve([]);
    }

    const cutoff = Date.now() - grace;
    const jobs = Array.from(this.jobsByState[status].values())
      .filter((job) => job.finishedOn && job.finishedOn < cutoff)
      .slice(0, limit);

    const removedJobs = [];
    for (const job of jobs) {
      this.jobsByState[status].delete(job.id);
      this.jobs.delete(job.id);
      removedJobs.push(job);
    }

    console.log(`[MockQueue] Cleaned ${removedJobs.length} ${status} jobs`);

    if (removedJobs.length > 0) {
      this.emit('cleaned', removedJobs, status);
    }

    return Promise.resolve(removedJobs);
  }

  retry(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return Promise.reject(new Error(`Job ${jobId} not found`));
    }

    if (job.state !== 'failed') {
      return Promise.reject(new Error(`Cannot retry job ${jobId} in state ${job.state}`));
    }

    // Mover de failed a waiting
    this.jobsByState.failed.delete(jobId);
    job.state = 'waiting';
    job.finishedOn = null;
    job.returnvalue = null;
    this.jobsByState.waiting.set(jobId, job);

    console.log(`[MockQueue] Job ${jobId} scheduled for retry`);
    this.emit('waiting', job.id, job.data);

    // Procesar el trabajo
    setTimeout(() => this._processJob(job), 10);

    return Promise.resolve(job);
  }

  close() {
    return Promise.resolve();
  }

  _failJob(job, error) {
    if (job.state === 'active') {
      this.jobsByState.active.delete(job.id);
    } else if (job.state === 'waiting') {
      this.jobsByState.waiting.delete(job.id);
    }

    job.state = 'failed';
    job.stacktrace.push(error.stack);
    job.finishedOn = Date.now();
    job.failedReason = error.message;
    this.jobsByState.failed.set(job.id, job);

    console.log(`[MockQueue] Job ${job.id} failed: ${error.message}`);
    this.emit('failed', job, error);
  }

  _completeJob(job, result) {
    this.jobsByState.active.delete(job.id);
    job.state = 'completed';
    job.returnvalue = result;
    job.finishedOn = Date.now();
    this.jobsByState.completed.set(job.id, job);

    console.log(`[MockQueue] Job ${job.id} completed`);
    this.emit('completed', job, result);
  }

  async _processJob(job) {
    const { tasksService, notificationLogsService } = this.server.services();

    this.server.log(['info', 'notification-queue', 'worker'], {
      message: 'Processing notification job',
      jobId: job.id,
      taskId: job.data.taskId,
      attempt: job.attemptsMade || 1,
      timestamp: new Date().toISOString()
    });

    try {
      // Verificar que la tarea existe
      let task;
      try {
        task = await tasksService.findOne(job.data.taskId);
      } catch (taskError) {
        throw new Error(`Task not found or inaccessible: ${job.data.taskId}`);
      }

      // Actualizar estado de la tarea a 'processing'
      await tasksService.update(job.data.taskId, {
        status: 'processing',
        updated_at: new Date()
      });

      // Procesar la notificación
      const result = await this._sendNotification(task);

      // Asegurar que recipients es un objeto o null antes de crearlo
      let recipientsForLog = null;
      if (result.recipients) {
        // Si es ya un objeto, usarlo directamente
        recipientsForLog =
          typeof result.recipients === 'object' && !Array.isArray(result.recipients)
            ? result.recipients
            : { list: result.recipients };
      }

      // Registrar log de notificación
      await notificationLogsService.create({
        task_id: job.data.taskId,
        sent_at: new Date(),
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        recipients: recipientsForLog,
        subject: result.subject || '',
        body: result.body || ''
      });

      // Actualizar estado de la tarea a 'completed' si fue exitoso
      if (result.success) {
        await tasksService.update(job.data.taskId, {
          status: 'completed',
          updated_at: new Date()
        });
      }

      this.server.log(['info', 'notification-queue', 'worker'], {
        message: 'Notification job processed',
        jobId: job.id,
        taskId: job.data.taskId,
        success: result.success,
        completedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const errorDetails = {
        message: 'Error processing notification job',
        jobId: job.id,
        taskId: job.data.taskId,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade || 1
      };

      this.server.log(['error', 'notification-queue', 'worker'], errorDetails);

      // Registrar log de error
      try {
        await notificationLogsService.create({
          task_id: job.data.taskId,
          sent_at: new Date(),
          status: 'failed',
          error_message: error.message,
          recipients: null, // Asegurando que es null
          subject: 'Error processing notification',
          body: JSON.stringify(errorDetails, null, 2)
        });
      } catch (logError) {
        this.server.log(['error', 'notification-queue', 'worker'], {
          message: 'Failed to create error log',
          error: logError.message
        });
      }

      throw error;
    }
  }
}

/**
 * Servicio de cola de notificaciones
 */
module.exports = class NotificationQueueService extends Schmervice.Service {
  constructor(...args) {
    super(...args);

    this.queue = null;
    this.initialized = false;

    // Configuración por defecto
    this.config = {
      enabled: process.env.NOTIFICATION_QUEUE_ENABLED === 'true',
      prefix: 'notification',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        tls: process.env.REDIS_TLS === 'true' ? {} : null
      },
      checkInterval: parseInt(process.env.NOTIFICATION_CHECK_INTERVAL || '60000', 10),
      concurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || '5', 10),
      defaultJobOptions: {
        attempts: parseInt(process.env.NOTIFICATION_JOB_ATTEMPTS || '5', 10),
        removeOnComplete: parseInt(process.env.NOTIFICATION_REMOVE_COMPLETED || '100', 10),
        removeOnFail: parseInt(process.env.NOTIFICATION_REMOVE_FAILED || '100', 10),
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    };

    // Ajustar configuración según el entorno
    this._adjustConfigForEnvironment();
  }

  /**
   * Inicializa el servicio después de que todos los plugins se han registrado
   * Este método se llama automáticamente por Schmervice
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.server.log(['info', 'notification-queue'], 'Initializing notification queue service');

    try {
      this.initialized = true;

      // Crear la cola (Bull o MockQueue)
      await this._setupQueue();

      // Configurar procesador de trabajos
      this._setupWorker();

      // Configurar programador de tareas
      await this._setupScheduler();

      // Registrar limpieza en apagado
      this.server.events.on('stop', async () => {
        await this._shutdown();
      });

      this.server.log(['info', 'notification-queue'], 'Notification queue service initialized successfully');
    } catch (error) {
      this.server.log(['error', 'notification-queue'], {
        message: 'Failed to initialize notification queue service',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Configura la cola (Bull o MockQueue)
   */
  _setupQueue() {
    if (this.config.enabled) {
      try {
        // Configuración de conexión Redis
        const redisConfig = this._getRedisConfig();

        // Crear cola real con Bull
        this.queue = new Bull(`${this.config.prefix}:queue`, redisConfig);

        this.server.log(['info', 'notification-queue'], {
          message: 'Bull queue initialized with Redis',
          redisHost: this.config.redis.host,
          redisPort: this.config.redis.port
        });
      } catch (error) {
        this.server.log(['error', 'notification-queue'], {
          message: 'Failed to initialize Bull queue with Redis',
          error: error.message,
          stack: error.stack
        });

        // Caer en modo fallback usando MockQueue
        this.queue = new MockQueue(`${this.config.prefix}:queue`);

        this.server.log(['warning', 'notification-queue'], {
          message: 'Fallback to mock queue due to Redis connection failure'
        });
      }
    } else {
      // Crear cola simulada para desarrollo
      this.queue = new MockQueue(`${this.config.prefix}:queue`);

      this.server.log(['info', 'notification-queue'], {
        message: 'Using mock queue (Redis disabled)'
      });
    }
  }

  /**
   * Configura el procesador de trabajos
   */
  _setupWorker() {
    this.server.log(['info', 'notification-queue'], {
      message: 'Setting up notification worker',
      concurrency: this.config.concurrency
    });

    // Configurar procesamiento de trabajos en la cola
    this.queue.process(this.config.concurrency, async (job) => {
      return await this._processJob(job);
    });

    // Eventos de cola para monitoreo y registro
    this._setupQueueEvents();
  }

  /**
   * Configura el programador de tareas
   */
  _setupScheduler() {
    this.server.log(['info', 'notification-queue'], {
      message: 'Setting up notification scheduler',
      checkInterval: this.config.checkInterval
    });

    // Detener programador existente si hay uno
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
    }

    // Detener el intervalo de verificación de servicio si existe
    if (serviceCheckInterval) {
      clearInterval(serviceCheckInterval);
    }

    // Iniciar el programador
    schedulerInterval = setInterval(async () => {
      try {
        await this.checkPendingTasks();
      } catch (error) {
        this.server.log(['error', 'notification-queue', 'scheduler'], {
          message: 'Error checking pending tasks',
          error: error.message,
          stack: error.stack
        });
      }
    }, this.config.checkInterval);

    // Realizar una verificación inicial inmediata
    this.checkPendingTasks().catch((error) => {
      this.server.log(['error', 'notification-queue', 'scheduler'], {
        message: 'Error in initial task check',
        error: error.message
      });
    });

    this.server.log(['info', 'notification-queue', 'scheduler'], {
      message: 'Notification scheduler started',
      checkInterval: this.config.checkInterval
    });
  }

  /**
   * Detiene el servicio
   */
  async _shutdown() {
    this.server.log(['info', 'notification-queue'], 'Shutting down notification queue service');

    // Detener programador
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }

    if (serviceCheckInterval) {
      clearInterval(serviceCheckInterval);
      serviceCheckInterval = null;
    }

    // Cerrar cola si es Bull real
    if (this.queue && typeof this.queue.close === 'function') {
      try {
        await this.queue.close();
        this.server.log(['info', 'notification-queue'], 'Queue closed successfully');
      } catch (error) {
        this.server.log(['error', 'notification-queue'], {
          message: 'Error closing queue',
          error: error.message
        });
      }
    }

    this.initialized = false;
  }

  /**
   * Ajusta la configuración según el entorno
   */
  _adjustConfigForEnvironment() {
    const env = process.env.NODE_ENV || 'development';

    // Ajustes específicos por entorno
    switch (env) {
      case 'development':
        this.config.defaultJobOptions.attempts = this.config.defaultJobOptions.attempts || 3;
        this.config.defaultJobOptions.backoff = { type: 'fixed', delay: 5000 };
        this.config.checkInterval = this.config.checkInterval || 30000; // 30 segundos
        break;

      case 'test':
        this.config.defaultJobOptions.attempts = this.config.defaultJobOptions.attempts || 2;
        this.config.defaultJobOptions.removeOnComplete = this.config.defaultJobOptions.removeOnComplete || 10;
        this.config.defaultJobOptions.removeOnFail = this.config.defaultJobOptions.removeOnFail || 10;
        this.config.checkInterval = this.config.checkInterval || 10000; // 10 segundos
        break;

      case 'production':
        this.config.defaultJobOptions.attempts = this.config.defaultJobOptions.attempts || 8;
        this.config.defaultJobOptions.backoff = { type: 'exponential', delay: 10000 };
        this.config.defaultJobOptions.removeOnComplete = this.config.defaultJobOptions.removeOnComplete || 500;
        this.config.defaultJobOptions.removeOnFail = this.config.defaultJobOptions.removeOnFail || 500;
        this.config.checkInterval = this.config.checkInterval || 300000; // 5 minutos
        this.config.maxStalledCount = 5;
        break;
    }
  }

  /**
   * Genera la configuración de conexión Redis para Bull
   */
  _getRedisConfig() {
    const redisConfig = {
      redis: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db
      }
    };

    // Añadir contraseña si está configurada
    if (this.config.redis.password) {
      redisConfig.redis.password = this.config.redis.password;
    }

    // Configurar TLS si está habilitado
    if (this.config.redis.tls) {
      redisConfig.redis.tls = { ...this.config.redis.tls };

      // Cargar certificado CA si se especifica
      if (process.env.REDIS_CA_CERT && fs.existsSync(process.env.REDIS_CA_CERT)) {
        redisConfig.redis.tls.ca = fs.readFileSync(process.env.REDIS_CA_CERT);
      }
    }

    // Configuración de proxy si está definido
    if (process.env.HTTP_PROXY && process.env.HTTP_PROXY_PORT) {
      redisConfig.redis.enableProxy = true;
      redisConfig.redis.proxyHost = process.env.HTTP_PROXY;
      redisConfig.redis.proxyPort = parseInt(process.env.HTTP_PROXY_PORT, 10);
    }

    return redisConfig;
  }

  /**
   * Configura los listeners de eventos para la cola
   */
  _setupQueueEvents() {
    // Solo configurar eventos si la cola tiene los métodos de eventos (Bull real)
    if (typeof this.queue.on !== 'function') {
      return;
    }

    // Eventos de trabajo
    this.queue.on('completed', (job, result) => {
      this.server.log(['info', 'notification-queue', 'event'], {
        message: 'Job completed',
        jobId: job.id,
        taskId: job.data.taskId,
        success: result.success
      });
    });

    this.queue.on('failed', (job, error) => {
      this.server.log(['error', 'notification-queue', 'event'], {
        message: 'Job failed',
        jobId: job.id,
        taskId: job.data ? job.data.taskId : 'unknown',
        error: error.message,
        attempts: job.attemptsMade
      });
    });

    this.queue.on('stalled', (jobId) => {
      this.server.log(['warning', 'notification-queue', 'event'], {
        message: 'Job stalled',
        jobId
      });
    });

    // Eventos de cola
    this.queue.on('error', (error) => {
      this.server.log(['error', 'notification-queue', 'event'], {
        message: 'Queue error',
        error: error.message
      });
    });

    this.queue.on('cleaned', (jobs, type) => {
      this.server.log(['info', 'notification-queue', 'event'], {
        message: 'Jobs cleaned',
        count: jobs.length,
        type
      });
    });
  }

  /**
   * Procesa un trabajo de la cola
   */
  async _processJob(job) {
    const { tasksService, notificationLogsService } = this.server.services();

    this.server.log(['info', 'notification-queue', 'worker'], {
      message: 'Processing notification job',
      jobId: job.id,
      taskId: job.data.taskId,
      attempt: job.attemptsMade || 1,
      timestamp: new Date().toISOString()
    });

    try {
      // Verificar que la tarea existe
      let task;
      try {
        task = await tasksService.findOne(job.data.taskId);
      } catch (taskError) {
        throw new Error(`Task not found or inaccessible: ${job.data.taskId}`);
      }

      // Actualizar estado de la tarea a 'processing'
      await tasksService.update(job.data.taskId, {
        status: 'processing',
        updated_at: new Date()
      });

      // Procesar la notificación
      const result = await this._sendNotification(task);

      if (!result.success) {
        await tasksService.update(job.data.taskId, {
          status: 'failed',
          updated_at: new Date()
        });
      }

      // Registrar log de notificación
      await notificationLogsService.create({
        task_id: job.data.taskId,
        sent_at: new Date(),
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        recipients: result.recipients || [],
        subject: result.subject || '',
        body: result.body || ''
      });

      // Actualizar estado de la tarea a 'completed' si fue exitoso
      if (result.success) {
        await tasksService.update(job.data.taskId, {
          status: 'completed',
          updated_at: new Date()
        });
      }

      this.server.log(['info', 'notification-queue', 'worker'], {
        message: 'Notification job processed',
        jobId: job.id,
        taskId: job.data.taskId,
        success: result.success,
        completedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const errorDetails = {
        message: 'Error processing notification job',
        jobId: job.id,
        taskId: job.data.taskId,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade || 1
      };

      this.server.log(['error', 'notification-queue', 'worker'], errorDetails);

      // Registrar log de error
      try {
        await notificationLogsService.create({
          task_id: job.data.taskId,
          sent_at: new Date(),
          status: 'failed',
          error_message: error.message,
          recipients: [],
          subject: 'Error processing notification',
          body: JSON.stringify(errorDetails, null, 2)
        });
      } catch (logError) {
        this.server.log(['error', 'notification-queue', 'worker'], {
          message: 'Failed to create error log',
          error: logError.message
        });
      }

      throw error;
    }
  }

  /**
   * Corrige el método _sendNotification en notification-queue-service.js
   * para que el campo recipients se guarde correctamente
   */
  async _sendNotification(task) {
    const { notificationTemplatesService, usersService } = this.server.services();

    try {
      // Obtener la plantilla adecuada para el tipo de notificación
      let template;
      try {
        template = await notificationTemplatesService.findByType(task.notification_type);
      } catch (templateError) {
        // Si no existe la plantilla, intentar crear una por defecto
        template = await notificationTemplatesService.getDefaultTemplate(task.notification_type);
      }

      if (!template) {
        return {
          success: false,
          error: `No template found for notification type: ${task.notification_type}`
        };
      }

      // Obtener los datos de los destinatarios
      const recipients = [];
      let userManagerArray = [];

      try {
        // Intentar parsear como JSON (lista de IDs)
        userManagerArray = JSON.parse(task.userManager);
      } catch (e) {
        // Si no es JSON válido, asumir que es un ID único o una lista separada por comas
        userManagerArray = task.userManager ? task.userManager.split(',').map((id) => id.trim()) : [];
      }

      // Si no hay destinatarios, no podemos enviar la notificación
      if (userManagerArray.length === 0) {
        return {
          success: false,
          error: 'No recipients specified in task'
        };
      }

      // Recuperar información de los usuarios
      for (const userId of userManagerArray) {
        try {
          const user = await usersService.findOne(userId);
          if (user && user.email) {
            recipients.push({
              id: user.id,
              email: user.email,
              name: user.full_name || user.username || user.email,
              user
            });
          }
        } catch (userError) {
          this.server.log(['warning', 'notification-queue', 'notifier'], {
            message: 'Could not find user for notification',
            userId,
            error: userError.message
          });
        }
      }

      if (recipients.length === 0) {
        return {
          success: false,
          error: 'No valid recipients found for notification'
        };
      }

      let subject = null;
      let body = null;

      // Enviar la notificación a cada destinatario
      const { notificationsService, emailService } = this.server.services();
      const results = [];

      for (const recipient of recipients) {
        try {
          // Procesar las plantillas de sujeto y cuerpo
          subject = this._fillTemplate(template.subject_template, task, recipient.user);
          body = this._fillTemplate(template.body_template, task, recipient.user);

          // Intentar usar notificationsService si tiene método para este tipo
          if (notificationsService) {
            switch (task.notification_type) {
              case 'document':
                if (notificationsService.documentNotification) {
                  const attachments = [
                    {
                      filename: recipient.user.organization.logo.name,
                      content: recipient.user.organization.logo.data.toString('base64'),
                      encoding: 'base64',
                      cid: recipient.user.organization.logo.name
                    }
                  ];
                  await notificationsService.documentNotification(
                    recipient.name,
                    recipient.email,
                    subject,
                    body,
                    attachments
                  );
                  results.push({ success: true, recipient: recipient.email });
                  continue;
                }

                break;

              case 'request':
                if (notificationsService.requestNotification) {
                  await notificationsService.requestNotification(recipient.name, recipient.email, subject, body);
                  results.push({ success: true, recipient: recipient.email });
                  continue;
                }

                break;

              case 'task':
                if (notificationsService.taskNotification) {
                  await notificationsService.taskNotification(recipient.name, recipient.email, subject, body);
                  results.push({ success: true, recipient: recipient.email });
                  continue;
                }

                break;
            }

            // Si no hay método específico, intentar con email genérico
            if (notificationsService.sendEmail) {
              await notificationsService.sendEmail(recipient.name, recipient.email, subject, body);
              results.push({ success: true, recipient: recipient.email });
              continue;
            } else if (notificationsService.welcomeEmail) {
              await notificationsService.welcomeEmail(recipient.name, recipient.email);
              results.push({ success: true, recipient: recipient.email });
              continue;
            }
          }

          // Fallback: usar emailService si está disponible
          if (emailService && emailService.send) {
            await emailService.send(recipient.name, 'custom', { content: body }, recipient.email, subject);
            results.push({ success: true, recipient: recipient.email });
          } else {
            // No hay servicio disponible para enviar el correo
            results.push({
              success: false,
              recipient: recipient.email,
              error: 'No email service available'
            });
          }
        } catch (sendError) {
          this.server.log(['error', 'notification-queue', 'notifier'], {
            message: 'Error sending notification',
            recipient: recipient.email,
            error: sendError.message
          });

          results.push({
            success: false,
            recipient: recipient.email,
            error: sendError.message
          });
        }
      }

      // Determinar el resultado general
      const allSuccessful = results.every((r) => r.success);
      const anySuccessful = results.some((r) => r.success);

      return {
        success: anySuccessful,
        partialSuccess: anySuccessful && !allSuccessful,
        subject,
        body,
        // IMPORTANTE: Convertir recipients a un objeto para que cumpla con la validación
        recipients: { list: recipients },
        results,
        error: allSuccessful ? null : 'Failed to send to some or all recipients'
      };
    } catch (error) {
      this.server.log(['error', 'notification-queue', 'notifier'], {
        message: 'Error processing notification',
        taskId: task.id,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        recipients: null
      };
    }
  }

  /**
   * Rellena una plantilla con datos de la tarea
   */
  _fillTemplate(template, task, user) {
    if (!template) return '';

    let processedTemplate = template;

    // Reemplazar placeholders básicos
    const replacements = {
      '{{task_id}}': task.id || '',
      '{{task_name}}': task.name || '',
      '{{task_description}}': task.description || '',
      '{{notification_date}}': this._formatDate(task.notification_date),
      '{{start_date}}': this._formatDate(task.start_date),
      '{{end_date}}': this._formatDate(task.end_date),
      '{{document_name}}': task.metadata_request.name || '', // Para compatibilidad con plantillas de documentos
      '{{document_id}}': task.metadata_request.id || '',
      '{{request_name}}': task.name || '', // Para compatibilidad con plantillas de solicitudes
      '{{request_id}}': task.metadata_request.id || '',
      '{{activity_time}}': task.actity_time || '',
      '{{organization_logo}}': `cid:${user.organization.logo.name}` || '',
      '{{company}}': task?.company?.tradename || user.organization.name || '',
      '{{front_document_url}}': task?.url || 'https://www.google.com'
    };

    // Realizar reemplazos
    Object.entries(replacements).forEach(([key, value]) => {
      processedTemplate = processedTemplate.replace(new RegExp(key, 'g'), value || '');
    });

    return processedTemplate;
  }

  /**
   * Formatea una fecha para visualización
   */
  _formatDate(date) {
    if (!date) return '';

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return String(date);
      }

      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return String(date);
    }
  }

  /**
   * Verifica si una tarea recurrente debe ejecutarse hoy
   */
  _isTaskDueToday(task) {
    if (!task.number_period || !task.select_period) {
      return true; // Si no tiene configuración de recurrencia, siempre ejecutar
    }

    const numberPeriod = parseInt(task.number_period, 10);
    if (isNaN(numberPeriod) || numberPeriod <= 0) {
      return true; // Si la recurrencia no es válida, ejecutar por seguridad
    }

    const today = new Date();
    const startDate = new Date(task.start_date || task.notification_date);

    // Calcular días transcurridos desde la fecha de inicio
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Si es una fecha pasada, no es recurrente
    if (daysDiff < 0) {
      return false;
    }

    // Normalizar periodo a minúsculas para comparación insensible a mayúsculas
    const period = (task.select_period || '').toLowerCase();

    switch (period) {
      case 'días':
      case 'dias':
      case 'dia':
      case 'day':
      case 'days':
        return daysDiff % numberPeriod === 0;

      case 'semanas':
      case 'semana':
      case 'week':
      case 'weeks':
        return daysDiff % (numberPeriod * 7) === 0;

      case 'meses':
      case 'mes':
      case 'month':
      case 'months':
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        // Calcular meses transcurridos
        const monthsDiff = (todayYear - startYear) * 12 + (todayMonth - startMonth);

        // Verificar si estamos en el mismo día del mes
        return monthsDiff % numberPeriod === 0 && today.getDate() === startDate.getDate();

      default:
        return true; // Si no reconocemos el periodo, ejecutar por seguridad
    }
  }

  // ==== MÉTODOS PÚBLICOS PARA API ====

  /**
   * Añadir un trabajo a la cola
   * @param {Object} data - Datos del trabajo
   * @param {Object} options - Opciones del trabajo
   * @returns {Promise<Object>} - Trabajo creado
   */
  async addJob(data, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const jobOptions = { ...this.config.defaultJobOptions, ...options };
    return await this.queue.add(data, jobOptions);
  }

  /**
   * Obtener un trabajo por ID
   * @param {string} id - ID del trabajo
   * @returns {Promise<Object|null>} - Trabajo o null si no existe
   */
  async getJob(id) {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.queue.getJob(id);
  }

  /**
   * Obtener trabajos por estado
   * @param {string|Array<string>} types - Estados a buscar
   * @param {number} start - Índice de inicio
   * @param {number} end - Índice de fin
   * @param {boolean} asc - Orden ascendente
   * @returns {Promise<Array<Object>>} - Lista de trabajos
   */
  async getJobs(types, start = 0, end = 15, asc = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.queue.getJobs(types, start, end, asc);
  }

  /**
   * Obtener recuento de trabajos por estado
   * @returns {Promise<Object>} - Recuento por estado
   */
  async getJobCounts() {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.queue.getJobCounts();
  }

  /**
   * Procesar una tarea manualmente
   * @param {string} taskId - ID de la tarea
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processTask(taskId) {
    if (!this.initialized) {
      await this.initialize();
    }

    this.server.log(['info', 'notification-queue', 'worker'], {
      message: 'Manual task processing requested',
      taskId
    });

    // Verificar que la tarea existe
    const { tasksService } = this.server.services();
    const task = await tasksService.findOne(taskId);

    // Verificar si ya hay un trabajo activo para esta tarea
    const activeJobs = await this.getJobs(['active', 'waiting']);
    const isAlreadyQueued = activeJobs.some((job) => job.data && job.data.taskId === taskId);

    if (isAlreadyQueued) {
      return {
        success: false,
        message: `Task ${taskId} is already being processed`,
        error: 'Task already queued'
      };
    }

    // Añadir trabajo a la cola
    const job = await this.addJob({
      taskId,
      manualTrigger: true,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      jobId: job.id,
      taskId,
      status: 'queued',
      message: `Task ${taskId} (${task.name}) queued for processing with job ID ${job.id}`
    };
  }

  /**
   * Busca tareas pendientes con status "created" desde la fecha actual
   * hasta una fecha futura especificada
   * @param {Object} options - Opciones de búsqueda
   * @param {boolean} options.ignoreTime - Ignora la hora programada y procesa todas las tareas
   * @param {string} options.endDate - Fecha final en formato YYYY-MM-DD
   * @returns {Promise<Object>} - Resultado del chequeo
   */
  async checkPendingTasks(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const ignoreTime = options.ignoreTime || false;

    try {
      const { tasksService } = this.server.services();
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

      // Si se proporciona una fecha final, usarla; de lo contrario, usar fecha actual
      const endDate = options.endDate || currentDate;

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      this.server.log(['info', 'notification-queue', 'scheduler'], {
        message: 'Checking for pending tasks',
        fromDate: currentDate,
        toDate: endDate,
        currentTime: currentTimeString
      });

      // Buscar tareas con status "created" desde hoy hasta la fecha final
      const pendingTasks = await tasksService.findAll({
        status: 'created',
        from_date: currentDate,
        to_date: endDate,
        page: 1,
        limit: 100
      });

      //console.log(`Tareas por procesar: ${pendingTasks.data.length}`);

      if (!pendingTasks.data || pendingTasks.data.length === 0) {
        this.server.log(['info', 'notification-queue', 'scheduler'], {
          message: 'No pending tasks found',
          fromDate: currentDate,
          toDate: endDate
        });
        return {
          success: true,
          count: 0,
          message: 'No pending tasks found',
          tasks: []
        };
      }

      this.server.log(['info', 'notification-queue', 'scheduler'], {
        message: 'Found pending tasks',
        count: pendingTasks.data.length,
        fromDate: currentDate,
        toDate: endDate
      });

      // Agregar cada tarea pendiente a la cola
      const addedJobs = [];
      const alreadyQueuedTasks = [];
      const skippedForTime = [];
      const skippedRecurrent = [];
      const skippedFutureDate = [];

      // Primero obtenemos todos los trabajos activos y en espera
      const existingJobs = await this.getJobs(['active', 'waiting']);

      for (const task of pendingTasks.data) {
        // Verificar si la tarea ya está en proceso
        const isAlreadyQueued = existingJobs.some((job) => job.data && job.data.taskId === task.id);

        if (isAlreadyQueued) {
          alreadyQueuedTasks.push({ id: task.id, name: task.name });
          this.server.log(['info', 'notification-queue', 'scheduler'], {
            message: 'Task already queued',
            taskId: task.id,
            taskName: task.name
          });
          continue;
        }

        // Verificar si debe ejecutarse hoy (para tareas recurrentes)
        if (task.select_period && !this._isTaskDueToday(task)) {
          skippedRecurrent.push({ id: task.id, name: task.name });
          this.server.log(['info', 'notification-queue', 'scheduler'], {
            message: 'Skipping recurrent task not due today',
            taskId: task.id,
            name: task.name
          });
          continue;
        }

        // Verificar si la tarea es para hoy o para fechas futuras
        const taskDate = new Date(task.notification_date);
        const taskDateString = taskDate.toISOString().split('T')[0];
        const isToday = taskDateString === currentDate;

        // Si no es para hoy y no estamos ignorando el tiempo, verificar la hora
        if (isToday && !ignoreTime && task.actity_time) {
          const [taskHour, taskMinute] = task.actity_time.split(':').map((n) => parseInt(n, 10));

          // Comparar la hora actual con la hora programada
          const isTimeToExecute = currentHour > taskHour || (currentHour === taskHour && currentMinute >= taskMinute);

          if (!isTimeToExecute) {
            skippedForTime.push({
              id: task.id,
              name: task.name,
              date: taskDateString,
              scheduledTime: task.actity_time,
              currentTime: currentTimeString
            });

            this.server.log(['info', 'notification-queue', 'scheduler'], {
              message: 'Skipping task - scheduled for later today',
              taskId: task.id,
              name: task.name,
              scheduledTime: task.actity_time,
              currentTime: currentTimeString
            });

            continue;
          }
        } else if (!isToday) {
          // Si no es para hoy, la añadimos a la lista de tareas futuras
          skippedFutureDate.push({
            id: task.id,
            name: task.name,
            date: taskDateString
          });

          this.server.log(['info', 'notification-queue', 'scheduler'], {
            message: 'Skipping task - scheduled for future date',
            taskId: task.id,
            name: task.name,
            scheduledDate: taskDateString
          });
          continue;
        }

        // Agregar tarea a la cola
        const job = await this.addJob({
          taskId: task.id,
          scheduledTrigger: true,
          timestamp: new Date().toISOString()
        });

        addedJobs.push({
          jobId: job.id,
          taskId: task.id,
          name: task.name,
          date: taskDateString,
          time: task.actity_time
        });

        this.server.log(['info', 'notification-queue', 'scheduler'], {
          message: 'Added task to queue',
          taskId: task.id,
          jobId: job.id,
          taskName: task.name,
          date: taskDateString,
          time: task.actity_time
        });
      }

      return {
        success: true,
        count: addedJobs.length,
        tasks: addedJobs,
        skippedForTime,
        skippedRecurrent,
        skippedFutureDate,
        alreadyQueued: alreadyQueuedTasks,
        message:
          `Added ${addedJobs.length} tasks to the queue. ` +
          `${skippedForTime.length} tasks skipped (scheduled for later today). ` +
          `${skippedFutureDate.length} tasks skipped (scheduled for future dates). ` +
          `${alreadyQueuedTasks.length} tasks were already queued.`
      };
    } catch (error) {
      this.server.log(['error', 'notification-queue', 'scheduler'], {
        message: 'Error checking pending tasks',
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        message: `Error checking pending tasks: ${error.message}`,
        count: 0,
        tasks: [],
        error: error.message
      };
    }
  }

  /**
   * Limpia trabajos antiguos
   * @param {number} grace - Periodo de gracia en ms
   * @param {string} status - Estado a limpiar ('completed', 'failed')
   * @param {number} limit - Límite de trabajos a limpiar
   * @returns {Promise<Array>} - Trabajos eliminados
   */
  async cleanJobs(grace = 0, status = 'completed', limit = 1000) {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.queue.clean(grace, status, limit);
  }
};
