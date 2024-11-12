
const express = require('express');
const router = express.Router(); 
const userController= require('../controllers/user/usercontrollers');
const profileController= require('../controllers/user/profileController');
const cartController= require('../controllers/user/cartController');
const passport = require('passport');
const {userAuth,adminAuth}=require('../middlewares/auth');

router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHome);

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);

router.get('/shopping',userController.loadShopping);

router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/shop', userController.loadShop);
router.get('/shop-details/:productId', userController.loadShopDetails);


router.get('/userProfile',profileController.userProfile);
router.get('/edit-profile',userAuth,profileController.loadEditProfile);
router.post('/edit-profile', userAuth, profileController.postEditProfile);

router.get('/profile/change-email',userAuth,profileController.changeEmail);
router.post('/profile/change-email',userAuth,profileController.changeEmailValid);
router.post('/profile/verify-email-otp',userAuth,profileController.verifyEmailOtp);
router.post('/profile/update-email',userAuth,profileController.updateEmail);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/profile/change-password',userAuth,profileController.changePassword);
router.post('/profile/change-password',userAuth,profileController.changePasswordValid);
router.post('/verify-changepassword-otp',userAuth,profileController.verifyPasswordOtp);

router.get('/reset-password',profileController.getResetPassPage);
router.post('/reset-password',profileController.postNewPassword);


router.get('/addAddress',userAuth,profileController.addAddress);
router.post('/addAddress',userAuth,profileController.addAddressPost);
router.get('/editAddress',userAuth,profileController.editAddress);
router.post('/editAddress',userAuth,profileController.editAddressPost);
router.get('/deleteAddress',userAuth,profileController.deleteAddress)

router.get('/shopping-cart',userAuth,cartController.showCart)
router.get('/checkout',userAuth,cartController.showPayment)





router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/signup' }), 
    (req, res) => {
        req.session.user = {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            googleId: req.user.googleId  
        };
       

        res.redirect('/');
    }
);

router.get('/logout',userController.logout);

module.exports= router;