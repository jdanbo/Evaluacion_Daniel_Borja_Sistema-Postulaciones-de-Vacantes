/**
 * Punto de entrada: valida la configuración, comprueba la base de datos
 * y arranca el servidor HTTP.
 */

// 1. Configuración: si falta una variable de entorno, salimos con un mensaje claro
let env;
try {
  env = require('./config/env');
} catch (error) {
  console.error(`[config] ${error.message}`);
  process.exit(1);
}

const { createApp } = require('./app');
const { pool, checkConnection } = require('./db/pool');

async function start() {
  // 2. Base de datos: fallar al inicio es mejor que fallar en la primera petición
  try {
    await checkConnection();
  } catch (error) {
    console.error('[db] No se pudo conectar a PostgreSQL. Revisa DATABASE_URL en tu archivo .env.');
    console.error(`[db] Detalle: ${error.message}`);
    process.exit(1);
  }

  // 3. Servidor HTTP
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] API escuchando en http://localhost:${env.port}`);
  });

  // 4. Apagado ordenado (Ctrl + C o señal del sistema): cierra el servidor y las conexiones
  const shutdown = (signal) => {
    console.log(`[server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
