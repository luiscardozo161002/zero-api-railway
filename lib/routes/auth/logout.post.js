'use strict';

module.exports = {
  method: 'POST',
  path: '/auth/logout',
  options: {
    auth: false,
    handler: (request, h) => {
      const response = h.response({ ok: true });
      response.unstate('zero_token', {
        path: '/'
      });
      return response.code(200);
    }
  }
};
