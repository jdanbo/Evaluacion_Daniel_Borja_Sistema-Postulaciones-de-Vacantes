/**
 * Acceso a datos de la tabla vacancies.
 */

function toVacancy(row) {
  return {
    id: row.id,
    title: row.title,
    minYearsExperience: Number(row.min_years_experience), // NUMERIC llega como texto
    status: row.status,
  };
}

/** @returns {Promise<object|null>} */
async function findById(db, id) {
  const { rows } = await db.query(
    `SELECT id, title, min_years_experience, status
       FROM vacancies
      WHERE id = $1`,
    [id]
  );
  return rows.length > 0 ? toVacancy(rows[0]) : null;
}

module.exports = { findById };
