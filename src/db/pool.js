/**
 * Conexión a PostgreSQL.
 *
 * Usamos un "pool": un grupo de conexiones abiertas que se reutilizan,
 * en lugar de abrir y cerrar una conexión por cada petición.
 */
const { Pool } = require('pg');
const { databaseUrl } = require('../config/env');

const pool = new Pool({ connectionString: databaseUrl });

// Error en una conexión inactiva del pool (por ejemplo, la BD se reinició).
// Se registra para no tumbar el proceso; la siguiente consulta reconecta.
pool.on('error', (error) => {
  console.error('[db] Error inesperado en una conexión inactiva:', error.message);
});

/**
 * Ejecuta varias consultas como UNA sola operación (transacción).
 * Si cualquier paso falla, se deshace todo (ROLLBACK) y no quedan datos a medias.
 *
 * @param {(client: import('pg').PoolClient) => Promise<T>} work función que recibe el cliente de la transacción
 * @returns {Promise<T>} lo que devuelva `work`
 * @template T
 */
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // Si el ROLLBACK también falla, conservamos el error original
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    // Siempre devolvemos la conexión al pool, pase lo que pase
    client.release();
  }
}

/** Verifica que la base de datos responda (se usa al arrancar el servidor). */
async function checkConnection() {
  await pool.query('SELECT 1');
}

module.exports = { pool, withTransaction, checkConnection };
