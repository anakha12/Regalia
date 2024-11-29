const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const session = require('express-session');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require("../../models/couponSchema");
const env = require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const path = require('path'); 
const fs = require('fs'); 



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
      const itemTotalPrice = productId.regularPrice * quantity;
      let discountPrice = itemTotalPrice - price;

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

    if(totalPrice>1000&&paymentMethod === 'Cash on Delivery'){
      return res.status(400).json({
        success: false,
        message: "Cash on Delivery is cont applicable. Please choose a different payment method.",
      });
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
    if (req.session.appliedCoupon) {
      delete req.session.appliedCoupon;
    }
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
       .populate('couponApplied')
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
 
    const order = await Order.findById(orderId).populate('couponApplied');
 
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const itemIndex = order.Ordereditems.findIndex(item => item.product.toString() == productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in order." });
    }
  
    const orderedItem = order.Ordereditems[itemIndex];
    const totalOrderPrice=order.totalPrice
    const canceledItemPrice = orderedItem.price;
    const coupon = order.couponApplied;
    const purchaseAmount = coupon ? coupon.purchaseAmount : 0; 
  
    
    

    if (order.paymentStatus === "Success") {

      if(totalOrderPrice-canceledItemPrice>purchaseAmount){

        const userWallet = await Wallet.findOne({ userId: order.userId });
      if (!userWallet) {
        const newWallet = new Wallet({
          amount: orderedItem.price,
          description: `Refund for canceled item: ${orderedItem.name}`,
          type: "credit",
        });
        await newWallet.save();
      }
      
      userWallet.totalAmount += orderedItem.price;
      userWallet.transaction.push({
        amount: orderedItem.price,
        description: `Refund for canceled item: ${orderedItem.name}`,
        type: "credit",
      });

      await userWallet.save();
      }else{
        let couponValue;
        if (coupon!=null){
           couponValue=coupon.couponAmount;
        }else{
          couponValue=0;
        }
        
        const userWallet = await Wallet.findOne({ userId: order.userId });
      if (!userWallet) {
        const newWallet = new Wallet({
          amount: orderedItem.price-couponValue,
          description: `Refund for canceled item: ${orderedItem.name}`,
          type: "credit",
        });
        await newWallet.save();
      }
      

     
      userWallet.totalAmount += orderedItem.price;
      userWallet.transaction.push({
        amount: orderedItem.price-couponValue,
        description: `Refund for canceled item: ${orderedItem.name}`,
        type: "credit",
      });

      await userWallet.save();
      }
      order.couponApplied = null;
        await order.save();
      
    }

    orderedItem.status = "Cancelled";
    await order.save();

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found in database." });
    }
    product.quantity += orderedItem.quantity;
    
    await product.save();

   
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

const verifyPaymentAfterRetry = async (req, res) => {

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

 
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    try {
      
      const order = await Order.findById(orderId);

      if (order && order.paymentStatus === 'Failed') {
       
        order.paymentStatus = 'Success'; 
        await order.save();
        
        return res.status(200).json({ success: true, message: 'Payment successfully verified.' });
      } else {
        return res.status(400).json({ success: false, message: 'Order payment status is not failed or order not found.' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while verifying payment.' });
    }
  } else {
    return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature.' });
  }
};

const invoice = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.session.user;

    const user = await User.findById(userId);
    const userAddress = await Address.findOne({ userId }).exec();

    if (!userAddress || userAddress.address.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const order = await Order.findById(orderId)
      .populate('Ordereditems.product')
      .populate('address');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.Ordereditems.find(
      (item) => item.product._id.toString() === productId
    );
    if (!item) {
      return res.status(404).json({ message: 'Item not found in the order' });
    }

    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs');

    const doc = new PDFDocument({ margin: 50 }); 
    const fileName = `invoice-${orderId}-${productId}.pdf`;
    const invoicesDir = path.join(__dirname, 'invoices');

    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir);
    }

    const filePath = path.join(invoicesDir, fileName);

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Regalia', { align: 'center' });
    doc.fontSize(10).text('Makeup Your Story!', { align: 'center' });
    doc.text('www.regalia.com | support@regalia.com', {
      align: 'center',
      underline: true,
    });
    doc.moveDown(1);

    // Invoice Title
    doc.fontSize(16).text('INVOICE', { align: 'center', underline: true }).moveDown(1);

    // Billing Information
    const address = userAddress.address[0];
    doc.fontSize(12).text('BILL TO:', 50, 150, { underline: true }).moveDown(0.5);
    doc.fontSize(10).text(`${user.name}`);
    doc.text(`${address.city}, ${address.state}, ${address.pincode}`);
    doc.text(`Phone: ${address.phone}`);
    doc.text(`Email: ${user.email}`);

    // Invoice Details
    doc.fontSize(12).text('INVOICE DETAILS:', 350, 150, { underline: true }).moveDown(0.5);
    doc.fontSize(10)
      .text(`Invoice No: ${orderId}`, 350)
      .text(`Date: ${new Date().toLocaleDateString()}`, 350)
      .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 350);

    doc.moveDown(1.5);

    // Table Headers
    const tableTop = 250;
    doc.fontSize(10)
      .text('Product', 50, tableTop, { continued: true })
      .text('Quantity', 170, tableTop, { continued: true })
      .text('Price', 270, tableTop, { continued: true })
      .text('Total', 370, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Content Helper Function
    const addRow = (doc, y, col1, col2, col3, col4) => {
      doc.text(col1, 50, y, { continued: true })
        .text(col2, 200, y, { continued: true })
        .text(col3, 300, y, { continued: true })
        .text(col4, 400, y);
    };

    // Add Table Content
    let y = tableTop + 30;
    addRow(doc, y, item.product.productName, item.quantity.toString(), `$${item.price.toFixed(2)}`, `$${item.totalPrice.toFixed(2)}`);

    doc.moveTo(50, y + 20).lineTo(550, y + 20).stroke();

    // Payment Summary
    const summaryTop = y + 40;
    doc.fontSize(10)
      .text(`Subtotal:`, 350, summaryTop, { continued: true })
      .text(`$${order.finalAmount.toFixed(2)}`, 450, summaryTop);
    doc.text(`Discount:`, 350, summaryTop + 15, { continued: true }).text(
      `-$${order.discount || '0.00'}`,
      445
    );
    doc.moveDown(1);
    doc.fontSize(12)
      .text(`Total Amount:`, 350, summaryTop + 25, { continued: true })
      .text(`$${order.totalPrice.toFixed(2)}`, 415);



    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

const handlePaymentFailure = async (req, res) => {
  try {
    const userId = req.session.user; // Assuming user is stored in session
    const { selectedAddressId, paymentMethod, couponApplied } = req.body;

    let couponId = null;
    let couponAmount = null;

    // Handle coupon logic
    if (couponApplied) {
      const coupon = await Coupon.findOne({ couponCode: couponApplied.toUpperCase(), isActive: true });
      if (coupon) {
        couponId = coupon._id;
        couponAmount = coupon.couponAmount;
      } else {
        return res.status(400).json({ error: 'Invalid or inactive coupon code.' });
      }
    }

    // Fetch user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    // Fetch the selected address
    const addressData = await Address.findOne(
      { userId, 'address._id': selectedAddressId },
      { 'address.$': 1 }
    );
    if (!addressData || addressData.address.length === 0) {
      return res.status(400).json({ message: 'Address not found.' });
    }
    const address = addressData.address[0];

    // Prepare ordered items
    let totalPrice = 0;
    let finalAmount = 0;
    const orderedItems = [];

    for (const item of cart.items) {
      const { productId, quantity } = item;

      const price = productId.salePrice * quantity;
      const name = productId.productName;
      const images = productId.productImage;
      const itemTotalPrice = productId.regularPrice * quantity;
      const discountPrice = itemTotalPrice - price;

      totalPrice += price;
      finalAmount += itemTotalPrice;

      orderedItems.push({
        product: productId._id,
        quantity,
        price,
        totalPrice: itemTotalPrice,
        discountPrice,
        name,
        images,
        status: 'Pending',
      });
    }

    const discount = finalAmount - totalPrice;

    // Apply coupon discount
    if (couponAmount) {
      totalPrice -= couponAmount;
    }

    // Create the new order with payment failure
    const newOrder = new Order({
      Ordereditems: orderedItems,
      totalPrice,
      discount,
      finalAmount,
      address: selectedAddressId,
      paymentMethod,
      paymentStatus: 'Failed', // Mark payment as failed
      invoiceDate: new Date(),
      status: 'Pending',
      couponApplied: couponId,
      userId,
    });

    await newOrder.save();

    // Clear user's cart
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.status(201).json({
      success: true,
      message: 'Order saved with payment status "Failed".',
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error('Error in handlePaymentFailure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save the order. Please try again later.',
    });
  }
};



module.exports = {
  addToOrder,
  getOrders,
  cancelOrder,
  returnOrder,
  razorpayCrate,
  verifyPayment,
  invoice,
  handlePaymentFailure,
  verifyPaymentAfterRetry,
};
