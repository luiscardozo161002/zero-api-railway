'use strict';
require('dotenv').config();
const { request: undiciRequest } = require('undici');

module.exports = [
  {
    method: 'POST',
    path: '/legacy/login',
    options: {
      auth: false,
      tags: ['api', 'legacy', 'proxy'],
      cors: true
    },
    handler: async (request, h) => {
      const baseUrl = process.env.LEGACY_URL_ORG_QA;
      if (!baseUrl) {
        return h.response({ message: 'LEGACY_URL_ORG_QA not set' }).code(500);
      }

      const target = `${baseUrl.replace(/\/+$/, '')}/login`;

      const p = request.payload || {};
      const email = p.email || p.userName;

      const outBody = {
        email,
        userName: email,
        password: p.password
      };

      try {
        const resp = await undiciRequest(target, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-organization': request.headers['x-organization'] || ''
          },
          body: JSON.stringify(outBody)
        });

        const text = await resp.body.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        return h.response(data).code(resp.statusCode);
      } catch (err) {
        return h.response({
          statusCode: 500,
          error: 'Legacy Proxy Error',
          message: err.message
        }).code(500);
      }
    }
  },
  {
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    path: '/legacy/{path*}',
    options: {
      auth: false,
      description: 'Gateway proxy para Legacy API',
      tags: ['api', 'legacy', 'proxy'],
      cors: true
    },
    handler: {
      proxy: {
        mapUri: (request) => {
          const subpath = request.params.path || '';
          const cleanPath = subpath.replace(/^\/legacy/, '');
          const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

          const baseUrl = process.env.LEGACY_URL_ORG_QA;
          if (!baseUrl) throw new Error('LEGACY_URL_ORG_QA environment variable is not set');

          const target = `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
          return { uri: target };
        },
        passThrough: true,
        xforward: true
      }
    }
  }
];
