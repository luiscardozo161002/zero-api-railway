'use strict';

const { Config } = require('../../../server/manifest');

const keys = Config.get('/JWT_SECRETS');

module.exports = () => ({
  name: 'jwt',
  scheme: 'jwt',
  options: {
    keys,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      nbf: false,
      exp: true
    },
    validate: ({ decoded: { payload } }) => {
      const { sub, email, scope, bill, organization_id } = payload;
      return {
        isValid: true,
        credentials: { user: sub, email, scope, bill, organization_id }
      };
    }
  }
});
