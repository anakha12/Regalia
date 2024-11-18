
const express = require('express');
const router = express.Router(); 
const userController= require('../controllers/user/usercontrollers');
const profileController= require('../controllers/user/profileController');
const orderController= require('../controllers/user/orderController');
const cartController= require('../controllers/user/cartController');
const wishlistController= require('../controllers/user/wishlistController');
const walletController= require('../controllers/user/walletController');
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

router.post('/addToCart',userAuth,cartController.addToCart)
router.get('/cart',userAuth,cartController.getCart)
router.get('/cart/remove/:productId', cartController.removeFromCart);
router.post('/cart/update-quantity/:productId',cartController.changeQuantity)
router.get('/checkout',userAuth,cartController.Checkout)
router.get('/addAddressCart',userAuth,profileController.addAddressCart);
router.post('/addAddressCart',userAuth,profileController.addAddressPostCart);

router.post('/addToOrder',userAuth,orderController.addToOrder)
router.get('/order',userAuth,orderController.getOrders);
router.post('/orders/cancel',orderController.cancelOrder);
router.get('/filterShop',userController.shop);
router.get('/search', userController.searchProducts);




router.post('/addToWishlist',userAuth,wishlistController.addToWishlist);
router.get('/wishlist',userAuth,wishlistController.getWishlist)
router.get('/wishlist/remove/:productId', wishlistController.removeFromWishlist);


router.get('/wallet', userAuth, walletController.getWallet);
router.post("/wallet/add-money",userAuth,walletController.addMoneyToWallet)

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