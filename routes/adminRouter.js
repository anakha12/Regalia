const express= require('express');
const router= express.Router();
const adminController= require("../controllers/admin/adminController");
const customerController=require('../controllers/admin/customerController');
const categoryController=require('../controllers/admin/categoryController');
const brandController=require("../controllers/admin/brandController");
const {userAuth,adminAuth}=require('../middlewares/auth');
const multer=require("multer");
const storage=require('../helpers/multer');
const uploads= multer({storage:storage});

router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/pageerror',adminController.pageerror);

router.get('/',adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory);


router.get('/users',adminAuth,customerController.customerInfo)

router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoyOffer',adminAuth,categoryController.removeCategoryOffer)

router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory);


router.get('/brands',adminAuth,brandController.getBrandPage);

module.exports=router;