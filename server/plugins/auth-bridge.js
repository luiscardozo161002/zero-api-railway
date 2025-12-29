'use strict';

exports.plugin = {
  name: 'auth-bridge',
  version: '1.0.0',
  register: async (server) => {
    server.ext('onPreAuth', (request, h) => {
      // Si NO viene Authorization pero SÍ hay cookie con el JWT, inyecta el header
      const hasAuth = !!request.headers.authorization;
      const token = request.state?.zero_token;
      if (!hasAuth && token) {
        request.headers.authorization = `Bearer ${token}`;
      }
      return h.continue;
    });
  }
};
