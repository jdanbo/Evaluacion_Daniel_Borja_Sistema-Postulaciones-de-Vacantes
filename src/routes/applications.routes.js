/**
 * Rutas de /applications: asocian método + URL con su controlador.
 */
const { Router } = require('express');
const controller = require('../controllers/applications.controller');

const router = Router();

router.post('/', controller.createApplication);
router.get('/', controller.listApplications);
router.put('/:id/status', controller.updateApplicationStatus);

module.exports = router;
