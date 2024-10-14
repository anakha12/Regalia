
const express = require('express');
const router = express.Router(); 
const userController= require('../controllers/user/usercontrollers');

router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHome);


module.exports= router;