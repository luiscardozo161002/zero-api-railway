'use strict';

const Server = require('../../server');

let server;

const getServer = async () => {
  if (!server) {
    server = await Server.deployment();
  }

  return server;
};

module.exports = { getServer };
