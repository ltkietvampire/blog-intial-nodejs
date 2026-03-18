const express = require('express')
const multer = require('multer');

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router()


const AuthController = require ('../app/controllers/AuthController')


router.post('/uploads-image-auth',upload.single('image'), AuthController.uploads);
router.post('/update-profile', AuthController.updateProfile);
router.post('/change-password', AuthController.changePassword);
    
router.get('/', AuthController.index);


module.exports = router;
