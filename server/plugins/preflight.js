'use strict';

exports.plugin = {
  name: 'preflight',
  version: '1.0.0',
  register: async (server) => {
    server.route({
      method: 'OPTIONS',
      path: '/{any*}',
      options: { auth: false },
      handler: (request, h) => {
        const origin = request.headers.origin;
        return h
          .response()
          .code(200)
          .header('access-control-allow-origin', origin)
          .header('access-control-allow-credentials', 'true')
          .header('access-control-allow-methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
          .header('access-control-allow-headers', 'authorization,content-type,x-organization')
          .header('access-control-expose-headers', 'set-cookie');
      }
    });
  }
};
