const express= require('express');
const router= express.Router();
const adminController= require("../controllers/admin/adminController");
const customerController=require('../controllers/admin/customerController');
const categoryController=require('../controllers/admin/categoryController');
const orderController=require('../controllers/admin/orderController');
const productController=require("../controllers/admin/productController");
const salesController=require("../controllers/admin/salesController");
const couponController=require("../controllers/admin/couponController");
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




router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts', adminAuth, uploads.array("images", 4), productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);

router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);

router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);

router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array("images",4),productController.editProduct);
router.post('/deleteImage',adminAuth,productController.deleteSingleImage);
router.get('/orderList',adminAuth,orderController.getAllOrders);
router.post('/updateOrderStatus',adminAuth,orderController.updateOrderStatus);
router.post('/cancelOrder',adminAuth,orderController.cancelOrder);
router.get('/coupon',adminAuth,couponController.getCoupon);


router.get('/addCoupon',adminAuth,couponController.getAddCoupon);
router.post('/addCoupon',adminAuth,couponController.postAddCoupon)

router.get('/deleteCoupon/:couponId',adminAuth,couponController.deleteCoupon);

router.get('/sales',adminAuth,salesController.getSales);
router.get('/dashboard/chart-data',adminController.loadChartData);
module.exports=router;
