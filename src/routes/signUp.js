const express = require('express')
const router = express.Router()

const SignUpController = require ('../app/controllers/SignUpController')


router.get('/', SignUpController.show);


module.exports = router;
