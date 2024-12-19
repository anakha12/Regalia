const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");

const getCoupon = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit; 

        const totalCoupons = await Coupon.countDocuments();

        const coupons = await Coupon.find()
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('coupon', { 
            coupons, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getAddCoupon = async (req, res) => {
    try {
       
        res.render('add-coupon', {
            pageTitle: 'Add Coupons', 
           
        });
    } catch (error) {
        console.error('Error rendering add coupon page:', error.message);
        res.status(500).send('An error occurred while loading the page.');
    }
};

const postAddCoupon = async (req, res) => {
    
    try {
        const coupons = req.body.coupons; 
        const savedCoupons = [];
    
        for (const couponData of coupons) {
            const existingCoupon = await Coupon.findOne({ couponCode: couponData.code });
    
            if (existingCoupon) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Coupon with code "${couponData.code}" already exists.` 
                });
            }
            console.log(couponData.amount,couponData.minPurchase)
            if(couponData.amount>couponData.minPurchase){
                return res.status(400).json({ 
                    success: false, 
                    message: `Coupon amount should be less than purchase amount` 
                });
            }
    
            const coupon = new Coupon({
                couponCode: couponData.code,
                description: couponData.description,
                couponType: couponData.paymentType === 'Percentage' ? 'Percentage' : 'Amount',
                couponAmount: couponData.amount,
                purchaseAmount: couponData.minPurchase,
                expirationDate: couponData.expiryDate,
                totalLimit: couponData.totalLimit || null,
                perUserLimit: couponData.perUserLimit || null,
            });
    
            const savedCoupon = await coupon.save();
            savedCoupons.push(savedCoupon);
        }
    
        res.json({ 
            success: true, 
            message: 'Coupons added successfully!', 
            coupons: savedCoupons 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add coupons.', 
            error: error.message 
        });
    }
    
};

const deleteCoupon=async(req,res)=>{
    try {
        const { couponId } = req.params; 
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
}

module.exports={
    getCoupon,
    getAddCoupon,
    postAddCoupon,
    deleteCoupon,
}