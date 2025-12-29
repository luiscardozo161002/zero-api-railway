'use strict';

const Glue = require('@hapi/glue');
const Exiting = require('exiting');
const { Manifest, Config } = require('./manifest');

exports.deployment = async ({ start } = {}) => {
  // Cargamos el manifest. (Asegúrate de tener el manifest híbrido que hicimos antes)
  const manifest = Manifest.get('/', process.env);

  // relativeTo es vital para que IIS encuentre los plugins
  const server = await Glue.compose(manifest, { relativeTo: __dirname });

  if (Config) {
    server.app.config = Config;
  }

  if (start) {
    await Exiting.createManager(server).start();

    // Si el puerto es un Named Pipe (string raro de Windows), mostramos un texto limpio
    let displayUri = server.info.uri;
    const isPipe = server.info.port && isNaN(server.info.port);

    if (isPipe) {
      displayUri = 'IIS Named Pipe (Internal)';
    }

    server.log(['start'], `Server started at ${displayUri}`);

    // Solo hacemos console.log si no es un Pipe raro, para mantener logs limpios
    if (!isPipe) {
      console.log('Documentation available at: %s/zeroclm-api', displayUri);
    } else {
      console.log('Server running on IISNode Pipe.');
    }

    return server;
  }

  await server.initialize();
  return server;
};


// Detectamos si estamos en IISNode mirando si el puerto es un Pipe
const isIISNode = process.env.PORT && typeof process.env.PORT === 'string' && process.env.PORT.includes('\\\\.\\pipe\\');
const isMainModule = require.main === module;

// Arrancamos SI es local (Main Module) O SI es IISNode (aunque no sea Main Module)
if (isMainModule || isIISNode) {

  exports.deployment({ start: true }).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
  });
}