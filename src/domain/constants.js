/**
 * Valores permitidos y parámetros de negocio.
 *
 * Todo el código usa estas constantes en lugar de escribir los textos
 * a mano: si una regla cambia, se cambia en un solo lugar.
 */

/** Fuentes de postulación permitidas */
const SOURCE = Object.freeze({
  REFERRAL: 'REFERRAL',
  INTERNAL: 'INTERNAL',
  JOB_BOARD: 'JOB_BOARD',
  OTHER: 'OTHER',
});

/** Estados de una postulación */
const STATUS = Object.freeze({
  RECEIVED: 'RECEIVED',
  IN_REVIEW: 'IN_REVIEW',
  REJECTED: 'REJECTED',
  HIRED: 'HIRED',
});

/** Estados de una vacante */
const VACANCY_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
});

/** Niveles de prioridad de revisión */
const PRIORITY = Object.freeze({
  TOP: 'TOP',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

const APPLICATION_SOURCES = Object.freeze(Object.values(SOURCE));
const APPLICATION_STATUSES = Object.freeze(Object.values(STATUS));

/** Postulaciones "vivas": todavía pueden cambiar de estado */
const ACTIVE_STATUSES = Object.freeze([STATUS.RECEIVED, STATUS.IN_REVIEW]);

/** Estados finales: ya no pueden cambiar */
const FINAL_STATUSES = Object.freeze([STATUS.REJECTED, STATUS.HIRED]);

/** Estado con el que nace toda postulación */
const INITIAL_STATUS = STATUS.RECEIVED;

/** Días que debe esperar un candidato rechazado para volver a postularse */
const REAPPLY_WAIT_DAYS = 30;

/** Largo máximo de la carta de presentación (caracteres) */
const COVER_LETTER_MAX_LENGTH = 5000;

module.exports = {
  SOURCE,
  STATUS,
  VACANCY_STATUS,
  PRIORITY,
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  ACTIVE_STATUSES,
  FINAL_STATUSES,
  INITIAL_STATUS,
  REAPPLY_WAIT_DAYS,
  COVER_LETTER_MAX_LENGTH,
};
