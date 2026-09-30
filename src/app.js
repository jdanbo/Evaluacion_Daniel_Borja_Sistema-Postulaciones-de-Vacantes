/**
 * Construye la aplicación Express (middlewares, rutas y manejo de errores).
 *
 * Está separada de server.js para poder crear la app sin abrir un puerto,
 * lo que facilita probarla.
 */
const express = require('express');
const { notFoundHandler, errorHandler } = require('./errors/errorHandler');
const applicationsRouter = require('./routes/applications.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by'); // no revelar la tecnología del servidor
  app.use(express.json({ limit: '100kb' })); // lee cuerpos JSON

  // Endpoint simple para comprobar que la API está viva
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/applications', applicationsRouter);

  // Siempre al final: ruta no encontrada y manejador de errores
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
