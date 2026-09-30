/**
 * Cálculo del puntaje y la prioridad de revisión de una postulación.
 *
 * Son funciones PURAS: reciben datos y devuelven un resultado, sin tocar la
 * base de datos ni HTTP. Por eso se pueden probar de forma aislada.
 *
 * Reglas (puntos):
 *   +4  años de experiencia del candidato >= mínimo exigido por la vacante
 *   +3  la fuente es REFERRAL
 *   +2  la fuente es INTERNAL
 *   +2  la carta menciona "node", "sql" o "api"
 *   +1  la carta tiene más de 500 caracteres
 *   -2  el candidato tiene 3 o más postulaciones activas en OTRAS vacantes
 *
 * Prioridad: TOP (7+), HIGH (5-6), MEDIUM (3-4), LOW (2 o menos, incluye negativos)
 */
const { SOURCE, PRIORITY } = require('./constants');

/** Puntos de cada regla. El nombre de la regla aparece en el desglose. */
const SCORE_RULES = Object.freeze({
  MEETS_MIN_EXPERIENCE: 4,
  SOURCE_REFERRAL: 3,
  SOURCE_INTERNAL: 2,
  COVER_LETTER_KEYWORDS: 2,
  LONG_COVER_LETTER: 1,
  MANY_ACTIVE_APPLICATIONS: -2,
});

/**
 * Palabras clave, sin distinguir mayúsculas:
 * - "node" y "api" deben INICIAR una palabra: cuentan "Node.js", "nodes", "APIs",
 *   pero no "capital", "rapid" ni "therapist" (que contienen "api" por dentro).
 * - "sql" cuenta en cualquier posición: "SQL", "MySQL", "PostgreSQL", "NoSQL".
 */
const KEYWORDS_PATTERN = /\bnode|sql|\bapi/i;

/** La carta debe tener MÁS de este número de caracteres para sumar */
const LONG_COVER_LETTER_THRESHOLD = 500;

/** Desde cuántas postulaciones activas en otras vacantes se penaliza */
const ACTIVE_APPLICATIONS_PENALTY_THRESHOLD = 3;

/**
 * Cuenta caracteres reales. `[...texto]` separa por caracteres Unicode, así
 * un emoji cuenta como 1 (con `texto.length` contaría como 2).
 */
function countCharacters(text) {
  return [...text.trim()].length;
}

/**
 * Calcula el puntaje y devuelve qué reglas se aplicaron.
 *
 * @param {object} input
 * @param {number} input.candidateYears años de experiencia del candidato (admite decimales)
 * @param {number} input.minYears años mínimos exigidos por la vacante
 * @param {string} input.source fuente de la postulación
 * @param {string} input.coverLetter carta de presentación
 * @param {number} input.otherActiveApplications postulaciones activas del candidato en otras vacantes
 * @returns {{ score: number, breakdown: Array<{ rule: string, points: number }> }}
 */
function calculateScore({ candidateYears, minYears, source, coverLetter = '', otherActiveApplications = 0 }) {
  const breakdown = [];
  const apply = (rule) => breakdown.push({ rule, points: SCORE_RULES[rule] });

  if (candidateYears >= minYears) apply('MEETS_MIN_EXPERIENCE');

  if (source === SOURCE.REFERRAL) apply('SOURCE_REFERRAL');
  if (source === SOURCE.INTERNAL) apply('SOURCE_INTERNAL');

  if (KEYWORDS_PATTERN.test(coverLetter)) apply('COVER_LETTER_KEYWORDS');
  if (countCharacters(coverLetter) > LONG_COVER_LETTER_THRESHOLD) apply('LONG_COVER_LETTER');

  if (otherActiveApplications >= ACTIVE_APPLICATIONS_PENALTY_THRESHOLD) apply('MANY_ACTIVE_APPLICATIONS');

  const score = breakdown.reduce((total, item) => total + item.points, 0);
  return { score, breakdown };
}

/**
 * Traduce un puntaje a prioridad de revisión.
 * @param {number} score
 * @returns {'TOP'|'HIGH'|'MEDIUM'|'LOW'}
 */
function getPriority(score) {
  if (score >= 7) return PRIORITY.TOP;
  if (score >= 5) return PRIORITY.HIGH;
  if (score >= 3) return PRIORITY.MEDIUM;
  return PRIORITY.LOW;
}

/**
 * Atajo que usa el servicio: puntaje + prioridad + desglose en un solo paso.
 * @param {Parameters<typeof calculateScore>[0]} input
 */
function evaluateApplication(input) {
  const { score, breakdown } = calculateScore(input);
  return { score, priority: getPriority(score), breakdown };
}

module.exports = {
  SCORE_RULES,
  KEYWORDS_PATTERN,
  calculateScore,
  getPriority,
  evaluateApplication,
};
