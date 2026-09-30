/**
 * Manejo centralizado de errores.
 *
 * Todas las respuestas de error tienen el mismo formato:
 * { "error": { "code": "...", "message": "...", "details": ... } }
 */
const AppError = require('./AppError');

// Códigos de error de PostgreSQL que traducimos a respuestas claras
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

/**
 * Convierte errores de PostgreSQL en AppError.
 * Son una red de seguridad: el servicio valida antes, pero si dos
 * peticiones compiten o hay un caso no previsto, la BD tiene la última palabra.
 */
function fromDatabaseError(error) {
  switch (error.code) {
    case PG_UNIQUE_VIOLATION:
      if (error.constraint === 'uq_applications_active_pair') {
        return AppError.conflict(
          'DUPLICATE_APPLICATION',
          'El candidato ya tiene una postulación activa para esta vacante'
        );
      }
      return AppError.conflict('CONFLICT', 'El registro ya existe');

    case PG_FOREIGN_KEY_VIOLATION:
      if (error.constraint === 'fk_applications_candidate') {
        return AppError.notFound('CANDIDATE_NOT_FOUND', 'El candidato no existe');
      }
      if (error.constraint === 'fk_applications_vacancy') {
        return AppError.notFound('VACANCY_NOT_FOUND', 'La vacante no existe');
      }
      return AppError.conflict('RELATED_RESOURCE_CONFLICT', 'El registro está relacionado con otros datos');

    case PG_CHECK_VIOLATION:
      return AppError.validation([{ constraint: error.constraint }], 'Los datos no cumplen las reglas de la base de datos');

    default:
      return null;
  }
}

/** Se ejecuta cuando ninguna ruta coincide con la petición. */
function notFoundHandler(req, res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `La ruta ${req.method} ${req.originalUrl} no existe`));
}

/** Middleware final de Express: recibe cualquier error lanzado en la app. */
// eslint-disable-next-line no-unused-vars -- Express reconoce el manejador por sus 4 parámetros
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let appError = null;

  if (error instanceof AppError) {
    appError = error;
  } else if (error.type === 'entity.parse.failed') {
    // JSON mal formado en el cuerpo (lo detecta express.json())
    appError = new AppError(400, 'INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido');
  } else if (error.type === 'entity.too.large') {
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la solicitud es demasiado grande');
  } else {
    appError = fromDatabaseError(error);
  }

  if (!appError) {
    // Error inesperado: el detalle va SOLO al log del servidor, nunca al cliente
    console.error('[error] Error no controlado:', error);
    appError = new AppError(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Intenta de nuevo más tarde.');
  }

  const body = { error: { code: appError.code, message: appError.message } };
  if (appError.details !== undefined) body.error.details = appError.details;

  return res.status(appError.statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
