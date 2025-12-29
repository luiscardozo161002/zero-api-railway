'use strict';

const H2o2 = require('@hapi/h2o2');

exports.plugin = {
  name: 'legacy-proxy-support',
  register: async (server) => {
    await server.register(H2o2);
    server.log(['plugin'], '✅ Plugin H2o2 (proxy) registrado');
  }
};


//Agregado el 24-10-2025