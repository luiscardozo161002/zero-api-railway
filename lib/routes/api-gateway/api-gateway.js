'use strict';
require('dotenv').config();
const { request: undiciRequest } = require('undici');

// ✅ Mapa de organizaciones a URLs legacy
const LEGACY_URL_MAP = {
  'qa': process.env.LEGACY_URL_ORG_QA,
  'fibra': process.env.LEGACY_URL_ORG_FIBRA,
  'maver': process.env.LEGACY_URL_ORG_MAVER,
  'demo': process.env.LEGACY_URL_ORG_DEMO,
  'fimpe': process.env.LEGACY_URL_ORG_FIMPE,
  'mainlandfarm': process.env.LEGACY_URL_ORG_MAINLANDFARM,
  'siigo': process.env.LEGACY_URL_ORG_SIIGO,
  'agroencymas': process.env.LEGACY_URL_ORG_AGROENCYMAS,
  'fplus': process.env.LEGACY_URL_ORG_FPLUS,
  'sblc': process.env.LEGACY_URL_ORG_SBLC,
  'clegal': process.env.LEGACY_URL_ORG_CLEGAL,
};

// ✅ Función para obtener URL legacy según organización
function getLegacyUrl(organization) {
  const url = LEGACY_URL_MAP[organization?.toLowerCase()];
  
  if (!url) {
    console.warn(`⚠️ No legacy URL found for organization: ${organization}`);
    return null;
  }
  
  console.log(`🔄 Routing ${organization} → ${url}`);
  return url;
}

module.exports = [
  {
    method: 'POST',
    path: '/legacy/login',
    options: {
      auth: false,
      tags: ['api', 'legacy', 'proxy'],
       cors: {
        origin: ['*'],  
        credentials: true,
        additionalHeaders: ['X-Organization'],
        exposedHeaders: ['X-Organization']
      }
    },
    handler: async (request, h) => {
      // ✅ Lee organización del header
      const organization = request.headers['x-organization'] || 'qa';
      
      if (!organization) {
        return h.response({ 
          message: 'X-Organization header required' 
        }).code(400);
      }
      
      // ✅ Obtiene URL legacy para esta organización
      const baseUrl = getLegacyUrl(organization);
      
      if (!baseUrl) {
        return h.response({ 
          message: `No legacy API configured for organization: ${organization}` 
        }).code(404);
      }

      const target = `${baseUrl.replace(/\/+$/, '')}/login`;
      const p = request.payload || {};
      const email = p.email || p.userName;

      const outBody = {
        userName: email,
        password: p.password
      };

      console.log(`🔐 Legacy login: ${organization} → ${target}`);

      try {
        const resp = await undiciRequest(target, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-organization': organization
          },
          body: JSON.stringify(outBody)
        });

        const text = await resp.body.text();
        let data;
        try { 
          data = JSON.parse(text); 
        } catch { 
          data = text; 
        }

        console.log(`✅ Legacy login success: ${organization}`);
        return h.response(data).code(resp.statusCode);
      } catch (err) {
        console.error(`❌ Legacy proxy error for ${organization}:`, err);
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
       cors: {
        origin: ['*'], 
        credentials: true,
        additionalHeaders: ['X-Organization'],
        exposedHeaders: ['X-Organization']
      }
    },
    handler: {
      proxy: {
        mapUri: (request) => {
          // ✅ Lee organización del header
          const organization = request.headers['x-organization'] || 'qa';
          
          if (!organization) {
            throw new Error('X-Organization header required');
          }
          
          // ✅ Obtiene URL legacy para esta organización
          const baseUrl = getLegacyUrl(organization);
          
          if (!baseUrl) {
            throw new Error(`No legacy API configured for organization: ${organization}`);
          }

          const subpath = request.params.path || '';
          const cleanPath = subpath.replace(/^\/legacy/, '');
          const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
          const target = `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;

          console.log(`🔄 Proxy: ${organization} ${request.method} ${normalizedPath} → ${target}`);

          return { uri: target };
        },
        passThrough: true,
        xforward: true
      }
    }
  }
];