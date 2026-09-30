/**
 * Acceso a datos de la tabla candidates.
 *
 * Cada función recibe `db`, que puede ser el pool o el cliente de una
 * transacción. Así el servicio decide si la consulta va dentro de una
 * transacción o no.
 */

/** Convierte una fila de la BD (snake_case) al formato de la API (camelCase). */
function toCandidate(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    // pg devuelve NUMERIC como texto para no perder precisión: lo convertimos
    yearsOfExperience: Number(row.years_of_experience),
  };
}

/**
 * Busca un candidato por id.
 * Con `forUpdate: true` bloquea la fila hasta que termine la transacción:
 * así dos postulaciones simultáneas del mismo candidato se procesan una
 * después de la otra y no se saltan la regla de duplicidad.
 *
 * @returns {Promise<object|null>}
 */
async function findById(db, id, { forUpdate = false } = {}) {
  const lock = forUpdate ? 'FOR UPDATE' : '';
  const { rows } = await db.query(
    `SELECT id, full_name, email, years_of_experience
       FROM candidates
      WHERE id = $1
      ${lock}`,
    [id]
  );
  return rows.length > 0 ? toCandidate(rows[0]) : null;
}

module.exports = { findById };
