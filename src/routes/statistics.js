const express = require('express')
const statisticController = require ('../app/controllers/StatisticController')
const router = express.Router()






router.get('/', statisticController.index);


module.exports = router;
