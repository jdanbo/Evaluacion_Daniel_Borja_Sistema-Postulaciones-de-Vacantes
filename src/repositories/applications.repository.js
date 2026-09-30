/**
 * Acceso a datos de la tabla applications.
 * Todas las consultas son parametrizadas ($1, $2...): los valores del
 * usuario nunca se concatenan dentro del SQL (evita inyección SQL).
 */
const { ACTIVE_STATUSES } = require('../domain/constants');

const APPLICATION_COLUMNS = `
  id, candidate_id, vacancy_id, cover_letter, source,
  score, priority, status, created_at, status_updated_at`;

/** Fila de la BD (snake_case) → objeto de la API (camelCase). */
function toApplication(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    vacancyId: row.vacancy_id,
    coverLetter: row.cover_letter,
    source: row.source,
    score: row.score,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at,
  };
}

/**
 * Última postulación del candidato a esa vacante (para la regla de duplicidad).
 * La base de datos calcula si ya pasaron los días de espera, usando su propio
 * reloj, para no depender de diferencias de hora con el servidor.
 *
 * @returns {Promise<{ id: number, status: string, canReapplyAt: Date, waitPeriodOver: boolean }|null>}
 */
async function findLatestByCandidateAndVacancy(db, candidateId, vacancyId, waitDays) {
  const { rows } = await db.query(
    `SELECT id,
            status,
            status_updated_at + make_interval(days => $3) AS can_reapply_at,
            now() >= status_updated_at + make_interval(days => $3) AS wait_period_over
       FROM applications
      WHERE candidate_id = $1
        AND vacancy_id = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [candidateId, vacancyId, waitDays]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    status: row.status,
    canReapplyAt: row.can_reapply_at,
    waitPeriodOver: row.wait_period_over,
  };
}

/** Cuántas postulaciones activas tiene el candidato en OTRAS vacantes. */
async function countActiveInOtherVacancies(db, candidateId, vacancyId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total
       FROM applications
      WHERE candidate_id = $1
        AND vacancy_id <> $2
        AND status = ANY($3::text[])`,
    [candidateId, vacancyId, ACTIVE_STATUSES]
  );
  return rows[0].total;
}

/** Inserta una postulación y devuelve la fila guardada. */
async function create(db, application) {
  const { rows } = await db.query(
    `INSERT INTO applications
       (candidate_id, vacancy_id, cover_letter, source, score, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${APPLICATION_COLUMNS}`,
    [
      application.candidateId,
      application.vacancyId,
      application.coverLetter,
      application.source,
      application.score,
      application.priority,
      application.status,
    ]
  );
  return toApplication(rows[0]);
}

/**
 * Lista postulaciones con los datos del candidato y la vacante.
 * Orden: puntaje de mayor a menor; en empate, la más antigua primero.
 * El id final asegura un orden estable si también coinciden las fechas.
 *
 * El WHERE se arma solo con fragmentos fijos y marcadores ($1, $2):
 * los valores del usuario viajan siempre como parámetros.
 *
 * @param {{ status?: string, vacancyId?: number }} filters
 */
async function findAll(db, filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (filters.vacancyId) {
    params.push(filters.vacancyId);
    conditions.push(`a.vacancy_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT a.id, a.status, a.source, a.score, a.priority, a.cover_letter,
            a.created_at, a.status_updated_at,
            c.id AS candidate_id, c.full_name AS candidate_name, c.email AS candidate_email,
            v.id AS vacancy_id, v.title AS vacancy_title
       FROM applications a
       JOIN candidates c ON c.id = a.candidate_id
       JOIN vacancies  v ON v.id = a.vacancy_id
       ${where}
      ORDER BY a.score DESC, a.created_at ASC, a.id ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    source: row.source,
    score: row.score,
    priority: row.priority,
    coverLetter: row.cover_letter,
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at,
    candidate: { id: row.candidate_id, fullName: row.candidate_name, email: row.candidate_email },
    vacancy: { id: row.vacancy_id, title: row.vacancy_title },
  }));
}

/** @returns {Promise<object|null>} */
async function findById(db, id) {
  const { rows } = await db.query(`SELECT ${APPLICATION_COLUMNS} FROM applications WHERE id = $1`, [id]);
  return rows.length > 0 ? toApplication(rows[0]) : null;
}

/**
 * Cambia el estado SOLO si la postulación está activa y el estado es distinto.
 * Todo en una sola sentencia (atómica): no hay espacio para que otra petición
 * cambie la fila entre "revisar" y "actualizar".
 *
 * @returns {Promise<object|null>} la postulación actualizada, o null si no se cambió nada
 */
async function updateStatusIfActive(db, id, newStatus) {
  const { rows } = await db.query(
    `UPDATE applications
        SET status = $2,
            status_updated_at = now()
      WHERE id = $1
        AND status = ANY($3::text[])
        AND status <> $2
      RETURNING ${APPLICATION_COLUMNS}`,
    [id, newStatus, ACTIVE_STATUSES]
  );
  return rows.length > 0 ? toApplication(rows[0]) : null;
}

module.exports = {
  findLatestByCandidateAndVacancy,
  countActiveInOtherVacancies,
  create,
  findAll,
  findById,
  updateStatusIfActive,
};
