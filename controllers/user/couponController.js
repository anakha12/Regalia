const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");


const getAllCoupon=async(req,res)=>{
    try {
     
        const coupons = await Coupon.find({
            isActive: true, 
            
        }).select('couponCode description couponType couponAmount maxDiscount');
      
        if (coupons.length === 0) {
            return res.status(500).json({ success: false, message: 'No coupons available' });
        }

        return res.status(200).json({ success: true, data: coupons });

    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }

}

module.exports={
    getAllCoupon,
}