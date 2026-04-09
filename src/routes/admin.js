const express = require('express');
const router = express.Router();

const AdminController = require('../app/controllers/AdminController');
const requireAdmin = require('../app/middleware/requireAdmin');
const requireAuth = require('../app/middleware/requireAuth');

router.use(requireAuth, requireAdmin);

router.get('/config', AdminController.configPage);
router.post('/config', AdminController.updateConfig);
router.get('/logs', AdminController.logsPage);
router.post('/toggle-ban', AdminController.toggleBanUser);

module.exports = router;
