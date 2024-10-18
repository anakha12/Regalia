
const express = require('express');
const router = express.Router(); 
const userController= require('../controllers/user/usercontrollers');
const passport = require('passport');

router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHome);

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);

router.get('/shopping',userController.loadShopping);

router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get('/login',userController.loadLogin);
router.post('/login',userController.login);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Corrected route for Google OAuth callback
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/signup' }), 
    (req, res) => {
        // Successful authentication, redirect to home page
        res.redirect('/');
    }
);

router.get('/logout',userController.logout);

module.exports= router;