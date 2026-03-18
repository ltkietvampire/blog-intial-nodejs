const express = require('express');
const router = express.Router();

const AnnouncementsController = require('../app/controllers/AnnouncementsController');
const requireManager = require('../app/middleware/requireManager');

router.get('/', AnnouncementsController.index);
router.post('/', requireManager, AnnouncementsController.store);
router.post('/:id/seen', AnnouncementsController.markSeen);

module.exports = router;
