'use strict';

const Path = require('path');
require('dotenv').config({ path: Path.join(__dirname, '../.env') });

const Confidence = require('@hapipal/confidence');
const Toys = require('@hapipal/toys');
const Schwifty = require('@hapipal/schwifty');

// Definimos la versión del API
const apiVersion = '/api/v1';

let globalPrefix = '';

const rawPort = process.env.PORT;
const isIISNode = rawPort && typeof rawPort === 'string' && rawPort.includes('\\\\.\\pipe\\');

if (isIISNode) {
  if (process.env.APP_POOL_ID) {
    globalPrefix = '/' + process.env.APP_POOL_ID;
  } else {
    globalPrefix = '/ZeroApiQA';
  }
} else if (process.env.RENDER) {
  globalPrefix = '';
} else {
  globalPrefix = '/ZeroApiQA';
}

const serverConfig = {
  host: isIISNode ? undefined : '0.0.0.0',
  port: isIISNode
    ? rawPort
    : {
      $filter: 'NODE_ENV',
      $default: { $param: 'PORT', $coerce: 'number', $default: 3001 },
      test: { $value: undefined }
    }
};

const Manifest = new Confidence.Store({
  server: {
    host: serverConfig.host,
    port: serverConfig.port,
    debug: {
      $filter: 'NODE_ENV',
      $default: {
        log: ['error', 'start'],
        request: ['error']
      },
      production: {
        $default: 3001
      },
      test: { $value: undefined }
    },
    routes: {
      cors: {
        origin: [
          'http://localhost:5286/',
          'http://localhost:3001/',
          'http://216.250.117.119/',
          'https://qa.zero-clm.com/',
          'https://maver.zero-clm.com/',
          'https://agroencymas.zero-clm.com/',
          'https://demo.zero-clm.com/',
          'https://fplus.zero-clm.com/',
          'https://fimpe.zero-clm.com/',
          'https://mainlandfarm.zero-clm.com/',
          'https://sblc.zero-clm.com/',
          'https://siigo.zero-clm.com/',
          'https://clegal.zero-clm.com/',
        ],
        credentials: true,
        headers: ['Authorization', 'Content-Type', 'X-Organization'],
        additionalHeaders: ['cache-control', 'x-request-with', 'X-Organization', 'Set-Cookie'],
        exposedHeaders: ['Set-Cookie'],
        maxAge: 86400
      }
    },
    debug: {
      $filter: 'NODE_ENV',
      $default: {
        log: ['error', 'start'],
        request: ['error']
      },
      production: {
        request: ['implementation']
      }
    }
  },
  register: {
    plugins: [
      {
        plugin: './plugins/auth-bridge'
      },
      {
        plugin: './plugins/preflight'
      },
      {
        plugin: '../lib',
        options: {},
        routes: {
          // Prod: /ZeroApiQA/api/v1 | Dev: /api/v1
          prefix: globalPrefix + apiVersion
        }
      },
      {
        plugin: '@hapipal/schwifty',
        options: {
          $filter: 'NODE_ENV',
          $default: {},
          $base: {
            migrateOnStart: true,
            knex: {
              client: 'pg',
              connection: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: String(process.env.DB_PASSWORD || ''),
                database: process.env.DB_NAME,
                ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
              },
              migrations: {
                stub: Schwifty.migrationsStubPath
              },
              pool: { min: 0, max: 3, idleTimeoutMillis: 7000 }
            }
          },
          production: {
            migrateOnStart: process.env.DATABASE_MIGRATE_ON_START === 'chí'
          }
        }
      },
      {
        plugin: {
          $filter: 'NODE_ENV',
          $default: '@hapipal/hpal-debug',
          production: Toys.noop
        }
      },
      {
        plugin: './plugins/swagger',
        options: {
          info: { title: 'API Documentation', version: '1.0.0' },
          basePath: globalPrefix,
          jsonPath: (globalPrefix || '') + '/swagger.json',
          documentationPath: (globalPrefix || '') + '/zeroclm-api'
        },
        ...(globalPrefix ? { routes: { prefix: globalPrefix } } : {})
      }
    ]
  }
});

const Config = new Confidence.Store({
  HOST: {
    $env: 'PUBLIC_HOST',
    $default: 'localhost:3001'
  },
  SUPPORT_EMAIL: {
    $env: 'SUPPORT_EMAIL',
    $default: 'soporte@gi-de.com'
  },
  JWT_SECRETS: {
    $filter: { $env: 'NODE_ENV' },
    $default: {
      $env: 'JWT_SECRETS',
      $coerce: 'array',
      $default: ['secreto-jwt-actual', 'secreto-jwt-en-deshuso']
    },
    production: {
      $env: 'JWT_SECRETS',
      $splitToken: ',',
      $coerce: 'array'
    }
  },
  AUTH0: {
    iss: {
      $env: 'AUTH0_DOMAIN',
      $default: ''
    },
    aud: {
      $env: 'AUTH0_AUDIENCE'
    },
    algorithms: {
      $env: 'AUTH0_ALGORITHMS',
      $default: 'RS256'
    }
  },
  SMTP: {
    host: {
      $filter: { $env: 'NODE_ENV' },
      $default: {
        $env: 'SMTP_HOST',
        $default: 'smtp.gmail.com'
      },
      test: {
        $env: 'SMTP_HOST',
        $default: 'smtp.mailtrap.io'
      }
    },
    port: {
      $filter: { $env: 'NODE_ENV' },
      $default: {
        $env: 'SMTP_PORT',
        $default: 465
      },
      test: {
        $env: 'SMTP_PORT',
        $default: 2525
      }
    },
    from: {
      $env: 'SMTP_FROM',
      $default: 'G&D<cervantes.isanchez@gmail.com>'
    },
    user: {
      $env: 'SMTP_USERNAME'
    },
    pass: {
      $env: 'SMTP_PASSWORD'
    }
  },
  MAILTRAP: {
    testingInboxId: {
      $env: 'MAILTRAP_TESTING_INBOX',
      $default: 1534773
    },
    apiToken: {
      $env: 'MAILTRAP_API_TOKEN'
    }
  },
  FRONTEND_HOST: {
    hostFrontend: {
      $env: 'FRONTEND_HOST',
      $default: 'http://localhost:5286'
    }
  },
  DEFAULT_NAMES: {
    defaultFolderName: {
      $env: 'DEFAULT_FOLDER_NAME',
      $default: 'Carpeta general'
    }
  },
  REDIS: {
    host: {
      $env: 'REDIS_HOST',
      $default: 'localhost'
    },
    port: {
      $env: 'REDIS_PORT',
      $coerce: 'number',
      $default: 6379
    },
    password: {
      $env: 'REDIS_PASSWORD',
      $default: null
    },
    db: {
      $env: 'REDIS_DB',
      $coerce: 'number',
      $default: 0
    },
    tls: {
      $filter: 'REDIS_TLS',
      $default: null,
      true: {}
    }
  },
  NOTIFICATION_QUEUE: {
    enabled: {
      $env: 'NOTIFICATION_QUEUE_ENABLED',
      $coerce: 'boolean',
      $default: false
    },
    checkInterval: {
      $env: 'NOTIFICATION_CHECK_INTERVAL',
      $coerce: 'number',
      $default: 60000
    },
    concurrency: {
      $env: 'NOTIFICATION_CONCURRENCY',
      $coerce: 'number',
      $default: 5
    },
    jobAttempts: {
      $env: 'NOTIFICATION_JOB_ATTEMPTS',
      $coerce: 'number',
      $default: 5
    },
    removeCompleted: {
      $env: 'NOTIFICATION_REMOVE_COMPLETED',
      $coerce: 'number',
      $default: 100
    },
    removeFailed: {
      $env: 'NOTIFICATION_REMOVE_FAILED',
      $coerce: 'number',
      $default: 100
    }
  }
});

module.exports = { Manifest, Config };
