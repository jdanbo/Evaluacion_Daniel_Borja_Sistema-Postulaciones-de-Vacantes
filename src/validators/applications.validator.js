/**
 * Validación de formato de las peticiones de /applications.
 *
 * Aquí solo se revisa la FORMA de los datos (tipos, obligatorios, valores
 * permitidos). Lo que depende de la base de datos (¿existe el candidato?,
 * ¿la vacante está abierta?) se valida en el servicio.
 *
 * Todas las funciones devuelven los datos ya limpios o lanzan un
 * AppError 400 con TODOS los problemas encontrados a la vez.
 */
const AppError = require('../errors/AppError');
const { APPLICATION_SOURCES, APPLICATION_STATUSES, COVER_LETTER_MAX_LENGTH } = require('../domain/constants');

/** Máximo valor de una columna INTEGER en PostgreSQL */
const MAX_DB_INTEGER = 2147483647;

const isMissing = (value) => value === undefined || value === null;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0 && value <= MAX_DB_INTEGER;

/** El cuerpo debe ser un objeto JSON (no un arreglo, ni texto, ni vacío). */
function assertBodyIsObject(body) {
  if (isMissing(body) || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.validation([
      { field: 'body', message: 'El cuerpo debe ser un objeto JSON (envía el encabezado Content-Type: application/json)' },
    ]);
  }
}

/** Revisa un id que llega en el cuerpo JSON (debe ser número, no texto). */
function checkBodyId(body, field, errors) {
  const value = body[field];
  if (isMissing(value)) {
    errors.push({ field, message: 'Es obligatorio' });
  } else if (!isPositiveInteger(value)) {
    errors.push({ field, message: 'Debe ser un número entero positivo' });
  }
}

/**
 * Convierte un id que llega como texto (en la URL o en la query) a número.
 * Solo acepta dígitos: "12" → 12; "12abc", "-1" o "1.5" → null.
 */
function parseTextId(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return isPositiveInteger(number) ? number : null;
}

/** Revisa que un valor pertenezca a una lista de valores permitidos. */
function checkAllowedValue(value, field, allowedValues, errors, { required }) {
  if (isMissing(value)) {
    if (required) errors.push({ field, message: 'Es obligatorio' });
    return;
  }
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    errors.push({ field, message: `Debe ser uno de: ${allowedValues.join(', ')}` });
  }
}

/**
 * POST /applications
 * @returns {{ candidateId: number, vacancyId: number, source: string, coverLetter: string }}
 */
function validateCreateApplication(body) {
  assertBodyIsObject(body);
  const errors = [];

  checkBodyId(body, 'candidateId', errors);
  checkBodyId(body, 'vacancyId', errors);
  checkAllowedValue(body.source, 'source', APPLICATION_SOURCES, errors, { required: true });

  const { coverLetter } = body;
  if (isMissing(coverLetter)) {
    errors.push({ field: 'coverLetter', message: 'Es obligatoria' });
  } else if (typeof coverLetter !== 'string') {
    errors.push({ field: 'coverLetter', message: 'Debe ser texto' });
  } else if (coverLetter.trim() === '') {
    errors.push({ field: 'coverLetter', message: 'No puede estar vacía' });
  } else if ([...coverLetter.trim()].length > COVER_LETTER_MAX_LENGTH) {
    errors.push({ field: 'coverLetter', message: `No puede superar ${COVER_LETTER_MAX_LENGTH} caracteres` });
  }

  if (errors.length > 0) throw AppError.validation(errors);

  // Solo se devuelven los campos permitidos: si el cliente envía score,
  // priority o status, se ignoran (los calcula el backend).
  return {
    candidateId: body.candidateId,
    vacancyId: body.vacancyId,
    source: body.source,
    coverLetter: coverLetter.trim(),
  };
}

/**
 * GET /applications?status=...&vacancyId=...
 * Ambos filtros son opcionales y se pueden combinar.
 * @returns {{ status?: string, vacancyId?: number }}
 */
function validateListQuery(query) {
  const errors = [];
  const filters = {};

  // Si el parámetro llega repetido (?status=A&status=B) Express lo entrega como arreglo
  for (const field of ['status', 'vacancyId']) {
    if (Array.isArray(query[field])) {
      errors.push({ field, message: 'Debe enviarse una sola vez' });
    }
  }

  if (!isMissing(query.status) && !Array.isArray(query.status)) {
    checkAllowedValue(query.status, 'status', APPLICATION_STATUSES, errors, { required: false });
    filters.status = query.status;
  }

  if (!isMissing(query.vacancyId) && !Array.isArray(query.vacancyId)) {
    const vacancyId = parseTextId(query.vacancyId);
    if (vacancyId === null) {
      errors.push({ field: 'vacancyId', message: 'Debe ser un número entero positivo' });
    }
    filters.vacancyId = vacancyId;
  }

  if (errors.length > 0) throw AppError.validation(errors);
  return filters;
}

/**
 * PUT /applications/:id/status
 * @returns {{ id: number, status: string }}
 */
function validateStatusUpdate(params, body) {
  const id = parseTextId(params.id);
  if (id === null) {
    throw AppError.validation([{ field: 'id', message: 'El id de la URL debe ser un número entero positivo' }]);
  }

  assertBodyIsObject(body);
  const errors = [];
  checkAllowedValue(body.status, 'status', APPLICATION_STATUSES, errors, { required: true });
  if (errors.length > 0) throw AppError.validation(errors);

  return { id, status: body.status };
}

module.exports = {
  validateCreateApplication,
  validateListQuery,
  validateStatusUpdate,
};
