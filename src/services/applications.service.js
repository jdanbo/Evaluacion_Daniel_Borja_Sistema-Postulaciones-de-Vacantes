/**
 * Casos de uso de postulaciones (lógica de negocio).
 *
 * El servicio no conoce HTTP (ni req ni res) ni escribe SQL: orquesta
 * validaciones de negocio, repositorios y el cálculo de puntaje.
 */
const AppError = require('../errors/AppError');
const { withTransaction, pool } = require('../db/pool');
const { evaluateApplication } = require('../domain/scoring');
const {
  STATUS,
  VACANCY_STATUS,
  ACTIVE_STATUSES,
  FINAL_STATUSES,
  INITIAL_STATUS,
  REAPPLY_WAIT_DAYS,
} = require('../domain/constants');

const candidatesRepository = require('../repositories/candidates.repository');
const vacanciesRepository = require('../repositories/vacancies.repository');
const applicationsRepository = require('../repositories/applications.repository');

/**
 * Regla de duplicidad: ¿puede el candidato postularse a esta vacante?
 * Revisa su postulación MÁS RECIENTE a la misma vacante.
 *   - Ninguna → puede.
 *   - Activa (RECEIVED / IN_REVIEW) → no puede.
 *   - HIRED → no puede (ya fue contratado para esa vacante).
 *   - REJECTED hace menos de 30 días → no puede todavía.
 *   - REJECTED hace 30 días o más → puede.
 */
function assertCanApply(latestApplication) {
  if (!latestApplication) return;

  const { id, status, waitPeriodOver, canReapplyAt } = latestApplication;

  if (ACTIVE_STATUSES.includes(status)) {
    throw AppError.conflict('DUPLICATE_APPLICATION', 'El candidato ya tiene una postulación activa para esta vacante', {
      reason: 'ACTIVE_APPLICATION',
      existingApplicationId: id,
      existingStatus: status,
    });
  }

  if (status === STATUS.HIRED) {
    throw AppError.conflict('DUPLICATE_APPLICATION', 'El candidato ya fue contratado para esta vacante', {
      reason: 'ALREADY_HIRED',
      existingApplicationId: id,
    });
  }

  if (status === STATUS.REJECTED && !waitPeriodOver) {
    throw AppError.conflict(
      'DUPLICATE_APPLICATION',
      `El candidato fue rechazado para esta vacante y debe esperar ${REAPPLY_WAIT_DAYS} días para volver a postularse`,
      {
        reason: 'REJECTION_WAIT_PERIOD',
        existingApplicationId: id,
        canReapplyAt,
      }
    );
  }
}

/**
 * Registra una postulación.
 * Todo ocurre en UNA transacción: si algo falla, no se guarda nada.
 *
 * @param {{ candidateId: number, vacancyId: number, source: string, coverLetter: string }} input datos ya validados
 */
async function createApplication(input) {
  const { candidateId, vacancyId, source, coverLetter } = input;

  return withTransaction(async (client) => {
    // 1. El candidato existe. Se bloquea su fila para que dos postulaciones
    //    simultáneas del mismo candidato se procesen una tras otra.
    const candidate = await candidatesRepository.findById(client, candidateId, { forUpdate: true });
    if (!candidate) {
      throw AppError.notFound('CANDIDATE_NOT_FOUND', `No existe un candidato con id ${candidateId}`);
    }

    // 2. La vacante existe y está abierta
    const vacancy = await vacanciesRepository.findById(client, vacancyId);
    if (!vacancy) {
      throw AppError.notFound('VACANCY_NOT_FOUND', `No existe una vacante con id ${vacancyId}`);
    }
    if (vacancy.status !== VACANCY_STATUS.OPEN) {
      throw AppError.conflict('VACANCY_NOT_OPEN', 'La vacante no está abierta y no recibe postulaciones', {
        vacancyStatus: vacancy.status,
      });
    }

    // 3. Regla de duplicidad (30 días tras un rechazo)
    const latest = await applicationsRepository.findLatestByCandidateAndVacancy(
      client,
      candidateId,
      vacancyId,
      REAPPLY_WAIT_DAYS
    );
    assertCanApply(latest);

    // 4. Datos para las reglas de prioridad
    const otherActiveApplications = await applicationsRepository.countActiveInOtherVacancies(
      client,
      candidateId,
      vacancyId
    );

    // 5. Puntaje y prioridad (lógica pura, en el dominio)
    const { score, priority, breakdown } = evaluateApplication({
      candidateYears: candidate.yearsOfExperience,
      minYears: vacancy.minYearsExperience,
      source,
      coverLetter,
      otherActiveApplications,
    });

    // 6. Guardar con el estado inicial RECEIVED
    const application = await applicationsRepository.create(client, {
      candidateId,
      vacancyId,
      source,
      coverLetter,
      score,
      priority,
      status: INITIAL_STATUS,
    });

    // El desglose no se guarda: se devuelve para que el reclutador entienda la prioridad
    return { ...application, scoreBreakdown: breakdown };
  });
}

/**
 * Lista postulaciones ordenadas por prioridad de revisión.
 * Un filtro sin resultados (incluso una vacante inexistente) devuelve una
 * lista vacía: filtrar no es buscar un recurso puntual, así que no es un 404.
 *
 * @param {{ status?: string, vacancyId?: number }} filters
 */
async function listApplications(filters) {
  return applicationsRepository.findAll(pool, filters);
}

/**
 * Cambia el estado de una postulación.
 *
 * Reglas:
 *   - Entre estados activos se permiten saltos y retrocesos (para corregir errores).
 *   - Un estado final (REJECTED o HIRED) ya no cambia → 409.
 *   - Pedir el mismo estado actual no es error → 200 sin cambios.
 *   - Cada cambio real actualiza status_updated_at.
 *
 * Primero intenta el UPDATE atómico; solo si no cambió nada consulta la fila
 * para explicar por qué (no existe, mismo estado o estado final).
 *
 * @returns {Promise<{ application: object, changed: boolean }>}
 */
async function updateApplicationStatus(id, newStatus) {
  const updated = await applicationsRepository.updateStatusIfActive(pool, id, newStatus);
  if (updated) return { application: updated, changed: true };

  const current = await applicationsRepository.findById(pool, id);

  if (!current) {
    throw AppError.notFound('APPLICATION_NOT_FOUND', `No existe una postulación con id ${id}`);
  }

  if (current.status === newStatus) {
    return { application: current, changed: false };
  }

  if (FINAL_STATUSES.includes(current.status)) {
    throw AppError.conflict(
      'APPLICATION_IN_FINAL_STATE',
      `La postulación está en estado final (${current.status}) y ya no puede cambiar`,
      { currentStatus: current.status }
    );
  }

  // Solo ocurre si otra petición cambió la fila justo entre el UPDATE y la consulta
  throw AppError.conflict('STATUS_CHANGED_CONCURRENTLY', 'El estado cambió mientras se procesaba la solicitud. Intenta de nuevo.', {
    currentStatus: current.status,
  });
}

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};
