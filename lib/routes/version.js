'use strict';

const Helpers = require('./helpers');
const Joi = require('joi');
const { Config } = require('../../server/manifest');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/version',
  options: {
    description: 'Version',
    response: {
      status: {
        200: Joi.object({
          commit: Joi.string().required()
        }),
        500: Helpers.HTTP_500
      }
    },
    handler: (request, h) => {
      const { commit } = Config.get('/CI_COMMIT_SHORT_SHA');

      return h.response({ commit });
    }
  }
});
