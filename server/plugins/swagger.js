'use strict';

const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Package = require('../../package.json');
const { Config } = require('../manifest');

const description = ``;

module.exports = {
  name: 'zeroclm-api-swagger',
  async register(server) {
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: {
          basePath: `api/v1`,
          OAS: 'v3.0',
          servers: [
            {
              url: 'https://dev-api.zeroclm.io',
              description: 'ZeroCLM API'
            },
            {
              url: 'https://sandbox.api.zeroclm.io',
              description: 'Sandbox'
            },
          ],
          jsonPath: '/swagger.json',
          jsonRoutePath: '/swagger.json',
          definitionPrefix: 'useLabel',
          info: {
            title: 'ZeroCLM API',
            version: Package.version,
            description: "Zero CLM API",
            termsOfService: Config.get('/T_O_S'),
            contact: {
              name: 'ZeroCLM Support',
              email: Config.get('/SUPPORT_EMAIL'),
              url: 'https://help.zeroclm.io/kb-tickets/new'
            }
          },
          swaggerUI: true,
          documentationPage: true,
          documentationPath: '/zeroclm-api',
          reuseDefinitions: true,
          debug: true,
          tryItOutEnabled: true,
          securityDefinitions: {
            basic: {
              type: 'http',
              scheme: 'basic'
            },
            jwt: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          },
          grouping: 'tags',
          tags: [
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'users', description: 'User management' },
            { name: 'organizations', description: 'Organization management' },
            { name: 'logs', description: 'System logs and audit trail' },
            { name: 'task', description: 'Task management' }
          ],
          security: [{ jwt: [] }, { basic: [] }]
        }
      }
    ]);
  }
};
