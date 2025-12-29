'use strict';

const { badGateway } = require('@hapi/boom');
const Helpers = require('./helpers');

module.exports = Helpers.withDefaults({
  method: 'GET',
  path: '/status',
  options: {
    description: 'Status endpoint',
    handler: (request, h) => {
      return request
        .knex()
        .raw('SELECT SUM(1+1) AS result')
        .then(() => h.response({ message: `Ok` }).code(200))
        .catch(() => badGateway());
    }
  }
});
