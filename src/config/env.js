/**
 * Configuración de la aplicación.
 *
 * Lee las variables de entorno UNA sola vez, las valida y las expone ya
 * convertidas. Si falta algo obligatorio, lanza un error claro al iniciar
 * en lugar de fallar más tarde con un mensaje confuso.
 */
const path = require('node:path');
const dotenv = require('dotenv');

// Carga el archivo .env de la raíz del proyecto (sin mensajes en consola)
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const DEFAULT_PORT = 3000;

function readPort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === '') return DEFAULT_PORT;

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT debe ser un número entre 1 y 65535 (valor recibido: "${raw}").`);
  }
  return port;
}

function readDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error(
      'Falta la variable DATABASE_URL. Copia .env.example como .env y coloca la URI de tu base de datos.'
    );
  }
  return url.trim();
}

module.exports = Object.freeze({
  port: readPort(),
  databaseUrl: readDatabaseUrl(),
});
