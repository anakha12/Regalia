const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require("../../models/couponSchema");
const env = require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');



const addToOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    
    const { selectedAddressId, paymentMethod, couponApplied } = req.body;
   
    let couponId = null;
    let couponAmount = null;
        if (couponApplied) {
            const coupon = await Coupon.findOne({ couponCode: couponApplied.toUpperCase(), isActive: true });
            if (coupon) {
                couponId = coupon._id;
                couponAmount = coupon.couponAmount; 
            } else {
                return res.status(400).json({ error: 'Invalid or inactive coupon code' });
            }
        }
  

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const addressData = await Address.findOne(
      { userId, 'address._id': selectedAddressId },
      { 'address.$': 1 }
    );

    if (!addressData || addressData.address.length === 0) {
      return res.status(400).json({ message: 'Address not found.' });
    }
    const address = addressData.address[0];

    let paymentStatus;
    if (paymentMethod === 'Wallet' || paymentMethod === 'Razorpay') {
      paymentStatus = 'Success';
    } else if (paymentMethod === 'Cash on Delivery') {
      paymentStatus = 'Pending';
    } else {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    let totalPrice = 0;
    let finalAmount=0;
    const orderedItems = [];

    for (const item of cart.items) {
      const { productId, quantity } = item;
      const price = productId.salePrice*quantity;
      const name = productId.productName;
      const images = productId.productImage;
      const discountPrice = productId.regularPrice - productId.salePrice;
      const itemTotalPrice = productId.regularPrice * quantity;

      totalPrice += price;
      finalAmount+=itemTotalPrice;

      orderedItems.push({
        product: productId._id,
        quantity,
        price,
        totalPrice: itemTotalPrice,
        paymentMethod,
        paymentStatus,
        discountPrice,
        name,
        images,
        status: 'Pending',
      });


      if (productId.quantity < quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${name}.` });
      }

      productId.quantity -= quantity;
      await productId.save();
    }

    const discount = finalAmount-totalPrice;
   


    if (paymentMethod === 'Wallet') {

      const wallet = await Wallet.findOne({ userId: userId._id });

      if (!wallet || wallet.totalAmount < finalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance in wallet. Please add funds or choose another payment method.',
        });
      }

      wallet.totalAmount -= finalAmount;
      wallet.transaction.push({
        amount: finalAmount,
        description: 'Order Payment',
        type: 'debit',
      });
      await wallet.save();
    }
    if(couponAmount){
      totalPrice=totalPrice-couponAmount;
    }
    const newOrder = new Order({
      Ordereditems: orderedItems,
      totalPrice,
      discount,
      finalAmount,
      address: selectedAddressId,
      paymentMethod,
      paymentStatus,
      invoiceDate: new Date(),
      status: 'Pending',
      couponApplied:couponId,
      userId,
    });

    await newOrder.save();

    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Error in addToOrder:", error);
    res.status(500).json({ message: 'Failed to place order. Please try again later.' });
  }
};


const getOrders = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect('/login');
    }

    const orders = await Order.find({ userId: user })
      .populate('address')
      .populate({
        path: 'Ordereditems.product',
        select: 'name images'
      })
      .lean();

    res.render('order', { orders, user });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Unable to fetch orders. Please try again later.");
  }
};


const cancelOrder = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
 
    const order = await Order.findById(orderId);
 
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const itemIndex = order.Ordereditems.findIndex(item => item.product.toString() == productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in order." });
    }

    const orderedItem = order.Ordereditems[itemIndex];
    if (order.paymentStatus === "Success") {
     
      const userWallet = await Wallet.findOne({ userId: order.userId });
      if (!userWallet) {
        return res.status(404).json({ success: false, message: "Wallet not found for the user." });
      }

     
      userWallet.totalAmount += orderedItem.totalPrice;
      userWallet.transaction.push({
        amount: orderedItem.totalPrice,
        description: `Refund for canceled item: ${orderedItem.name}`,
        type: "credit",
      });

      await userWallet.save();
    }

    orderedItem.status = "Cancelled";
    await order.save();

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found in database." });
    }
    product.quantity += orderedItem.quantity;
    await product.save();

    order.finalAmount -= orderedItem.totalPrice;

    return res.json({ success: true, message: "Item status updated to 'Cancelled' successfully." });
  } catch (error) {
    console.error("Error canceling order item:", error);
    res.status(500).json({ success: false, message: "An error occurred while canceling the item." });
  }
};


const returnOrder = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
 
    const order = await Order.findById(orderId);
 
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const itemIndex = order.Ordereditems.findIndex(item => item.product.toString() == productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in order." });
    }

    const orderedItem = order.Ordereditems[itemIndex];

    orderedItem.status = "Returned";
    await order.save();

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found in database." });
    }
    product.quantity += orderedItem.quantity;
    await product.save();

    order.finalAmount -= orderedItem.totalPrice;

    const userWallet = await Wallet.findOne({ userId: order.userId });
      if (!userWallet) {
        return res.status(404).json({ success: false, message: "Wallet not found for the user." });
      }

     
      userWallet.totalAmount += orderedItem.totalPrice;
      userWallet.transaction.push({
        amount: orderedItem.totalPrice,
        description: `Refund for return item: ${orderedItem.name}`,
        type: "credit",
      });

      await userWallet.save();
    return res.json({ success: true, message: "Item status updated to 'Returned' successfully." });
  } catch (error) {
    console.error("Error canceling order item:", error);
    res.status(500).json({ success: false, message: "An error occurred while returning the item." });
  }
};

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,  
  key_secret: process.env.RAZORPAY_KEY_SECRET  
});


const razorpayCrate = async (req, res) => {
  const { amount } = req.body;

  const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
     
  };

  try {
      const order = await instance.orders.create(options); 
      res.json({ 
          success: true, 
          order_id: order.id, 
          amount: order.amount, 
          key_id: process.env.RAZORPAY_KEY_ID 
      });
  } catch (error) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({ success: false, message: 'Failed to create Razorpay order.' });
  }
};


const verifyPayment =async(req,res)=> {

  const {razorpay_payment_id,razorpay_order_id,razorpay_signature}=req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
 
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');
 if(generatedSignature === razorpay_signature){
  return res.status(200).json({success:true,message:"Success"});
 } 

};


module.exports = {
  addToOrder,
  getOrders,
  cancelOrder,
  returnOrder,
  razorpayCrate,
  verifyPayment,

};
