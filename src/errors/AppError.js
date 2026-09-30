/**
 * Error de aplicación "esperado": algo que sabemos manejar y que debe
 * llegar al cliente con un código HTTP y un código de error estables.
 *
 * Todo lo que NO sea un AppError se trata como error inesperado (500).
 */
class AppError extends Error {
  /**
   * @param {number} statusCode código HTTP (400, 404, 409...)
   * @param {string} code código estable para el cliente (ej. "VACANCY_NOT_OPEN")
   * @param {string} message mensaje legible para personas
   * @param {object|Array} [details] información extra opcional
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** 400: la petición tiene datos inválidos. */
  static validation(details, message = 'La solicitud contiene datos inválidos') {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  /** 404: el recurso no existe. */
  static notFound(code, message) {
    return new AppError(404, code, message);
  }

  /** 409: la petición es válida pero choca con el estado actual de los datos. */
  static conflict(code, message, details) {
    return new AppError(409, code, message, details);
  }
}

module.exports = AppError;
