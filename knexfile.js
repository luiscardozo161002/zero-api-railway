'use strict';

require('dotenv').config();

const Path = require('path');
const Hoek = require('@hapi/hoek');
const { Manifest } = require('./server/manifest');
const PluginConfig = require('./lib/plugins/@hapipal.schwifty').options;

// Take schwifty registration's knex option
// but specify the plugin's migrations directory

const knexConfig = Manifest.get('/register/plugins', process.env).find(({ plugin }) => plugin === '@hapipal/schwifty').options.knex;
// console.log('Knex Config:', knexConfig); 

module.exports = Hoek.applyToDefaults(
  {
    seeds: {
      directory: Path.relative(process.cwd(), PluginConfig.migrationsDir + '/../seeds')
    },
    migrations: {
      directory: Path.relative(process.cwd(), PluginConfig.migrationsDir)
    }
  },
  knexConfig
);

// module.exports = Hoek.applyToDefaults(
//   {
//     seeds: {
//       directory: Path.relative(process.cwd(), PluginConfig.migrationsDir + '/../seeds')
//     },
//     migrations: {
//       directory: Path.relative(process.cwd(), PluginConfig.migrationsDir)
//     }
//   },
//   Manifest.get('/register/plugins', process.env).find(({ plugin }) => plugin === '@hapipal/schwifty').options.knex
// );
