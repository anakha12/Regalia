const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const User=require('../../models/userSchema');
const Category=require('../../models/categorySchema');
const env= require('dotenv').config();



const addToOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { selectedAddressId, couponApplied } = req.body;

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    
    const addressData = await Address.findOne({
      userId,
      'address._id': selectedAddressId,
    }, { 'address.$': 1 });

    if (!addressData || addressData.address.length === 0) {
      return res.status(400).json({ message: 'Address not found.' });
    }
    const address = addressData.address[0];

    let totalPrice = 0;
    const orderedItems = cart.items.map((item) => {
      const { productId, quantity } = item;
      const price = productId.salePrice;
      const name = productId.productName;
      const images = productId.productImage; 
      const discountPrice = productId.regularPrice - productId.salePrice;
      const itemTotalPrice = price * quantity;

      totalPrice += itemTotalPrice;

      return {
        product: productId._id,
        quantity,
        price,
        totalPrice: itemTotalPrice,
        discountPrice,
        name,       
        images,      
      };
    });

    const discount = couponApplied ? 10 : 0;
    const finalAmount = totalPrice - (totalPrice * discount) / 100;

    const newOrder = new Order({
      Ordereditems: orderedItems,
      totalPrice,
      discount,
      finalAmount,
      address: selectedAddressId,
      invoiceDate: new Date(),
      status: 'Pending',
      couponApplied,
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
      .populate('Ordereditems.product') 
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
    console.log(req.body);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const itemIndex = order.Ordereditems.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in order." });
    }

    if (order.status !== 'Pending' && order.status !== 'Processing') {
      return res.status(400).json({ success: false, message: "Order cannot be canceled at this stage." });
    }

    order.finalAmount -= order.Ordereditems[itemIndex].totalPrice;

    order.Ordereditems.splice(itemIndex, 1);

    if (order.Ordereditems.length === 0) {
      await Order.findByIdAndDelete(orderId);
      return res.json({ success: true, message: "Order canceled and deleted successfully." });
    } else {
   
      await order.save();
      return res.json({ success: true, message: "Item canceled and removed successfully." });
    }
  } catch (error) {
    console.error("Error canceling order item:", error);
    res.status(500).json({ success: false, message: "An error occurred while canceling the item." });
  }
};








module.exports = { 
    addToOrder,
    getOrders,
    cancelOrder,
 };
