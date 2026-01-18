const express = require('express')
const router = express.Router()

const SearchController = require ('../app/controllers/SearchController')


router.use('/:slug', SearchController.show);
router.use('/', SearchController.index);


module.exports = router;
