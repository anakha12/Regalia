const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");


const getAllCoupon=async(req,res)=>{
    try {
        const coupons = await Coupon.find({});
        res.status(200).json({ success: true, coupons });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch coupons.' });
    }

}

const applyCoupon = async (req, res) => {
    const userId = req.session.user;
    const { couponCode, totalPrice } = req.body;

    try {
        const coupon = await Coupon.findOne({ couponCode });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }

        // Check if the coupon is active and not expired
        // if (!coupon.isActive || coupon.expirationDate < new Date()) {
        //     return res.status(400).json({ success: false, message: 'Coupon is either inactive or expired.' });
        // }
        if (coupon.totalLimit !== null && coupon.totalLimit <= 0) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached.' });
        }

        if (totalPrice < coupon.purchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Coupon not applicable. Minimum purchase amount should be ${coupon.purchaseAmount}.`
            });
        }

        const discount = parseFloat(coupon.couponAmount || 0);
        const discountedPrice = (totalPrice - discount).toFixed(2);
        if (discountedPrice < 0) {
            return res.status(400).json({ success: false, message: 'Discount exceeds total price.' });
        }

        const couponUser = await User.findById(userId);
        if (!couponUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const couponIdToApply = coupon._id;
        let couponIndex = couponUser.couponApplied.findIndex(
            (appliedCoupon) => appliedCoupon.couponId.toString() === couponIdToApply.toString()
        );

        if (couponIndex === -1) {
            if (coupon.perUserLimit && coupon.perUserLimit <= 0) {
                return res.status(400).json({ success: false, message: 'Coupon usage limit reached for all users.' });
            }
            couponUser.couponApplied.push({
                couponId: couponIdToApply,
                usedCount: 1,
            });
        } else {
            const userCoupon = couponUser.couponApplied[couponIndex];
            if (coupon.perUserLimit && userCoupon.usedCount >= coupon.perUserLimit) {
                return res.status(400).json({ success: false, message: 'Maximum usage limit reached for this coupon.' });
            }
            couponUser.couponApplied[couponIndex].usedCount += 1;
        }
        if (coupon.totalLimit !== null) {
            coupon.totalLimit -= 1;
            if (coupon.totalLimit < 0) coupon.totalLimit = 0; 
            await coupon.save();
        }

        await couponUser.save();

        res.status(200).json({ success: true, discount, discountedPrice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
    }
};

const removeCoupon= async(req,res)=>{
    const { couponCode, totalPrice } = req.body;

    try {
        const coupon = await Coupon.findOne({ couponCode });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }

        const discount = parseFloat(coupon.couponAmount || 0); 
        const discountedPrice = (totalPrice + discount).toFixed(2);
        console.log(discountedPrice)
        

        res.status(200).json({ success: true, discount, discountedPrice });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
    }
}



module.exports={
    getAllCoupon,
    applyCoupon,
    removeCoupon,
}