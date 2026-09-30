/**
 * Controladores de /applications.
 *
 * Su único trabajo: leer la petición, llamar al validador y al servicio,
 * y armar la respuesta HTTP. No contienen reglas de negocio ni SQL.
 *
 * Express 5 envía automáticamente al manejador de errores cualquier error
 * lanzado en una función async, por eso no hace falta try/catch aquí.
 */
const validator = require('../validators/applications.validator');
const applicationsService = require('../services/applications.service');

/** POST /applications */
async function createApplication(req, res) {
  const input = validator.validateCreateApplication(req.body);
  const application = await applicationsService.createApplication(input);

  res.status(201).location(`/applications/${application.id}`).json({ data: application });
}

/** GET /applications */
async function listApplications(req, res) {
  const filters = validator.validateListQuery(req.query);
  const applications = await applicationsService.listApplications(filters);

  res.json({ count: applications.length, data: applications });
}

/**
 * PUT /applications/:id/status
 * `changed` indica si hubo un cambio real (false si se pidió el mismo estado).
 */
async function updateApplicationStatus(req, res) {
  const { id, status } = validator.validateStatusUpdate(req.params, req.body);
  const { application, changed } = await applicationsService.updateApplicationStatus(id, status);

  res.json({ changed, data: application });
}

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};
