
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const session = require('express-session');
const Coupon = require("../../models/couponSchema");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const User=require('../../models/userSchema');
const Category=require('../../models/categorySchema');

const env= require('dotenv').config();


const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login'); 
        }
       
        let  { productId, quantity } = req.body;
        quantity = quantity ? parseInt(quantity, 10) : 1;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if ( isNaN(quantity) || quantity <= 0) {
            console.error('Invalid price or quantity');
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
      
        if (existingItem) {
            existingItem.quantity += parseInt(quantity, 10);
            existingItem.totalPrice = existingItem.quantity * product.salePrice;
        } else {
            cart.items.push({
                productId,
                quantity: parseInt(quantity, 10),
                price: product.salePrice,
                totalPrice: parseInt(quantity, 10) * product.salePrice,
                status: 'placed',
                CancellationReason: 'none'
            });
        }

        await cart.save();
        return res.status(200).json({ message: 'Product added successfully' });
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId); // Assuming you have a User model

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName salePrice productImage',
        });
       

        const items = cart && cart.items.length > 0 ? cart.items : [];
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const total = subtotal; 

        res.render('cart', {
            user,
            
            items,
            subtotal,
            total,
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Failed to load cart');
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.productId; 

        if (!userId) {
            return res.redirect('/login');
        }
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== productId); // Remove by productId

        await cart.save();

        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).send('Failed to remove product');
    }
};
const changeQuantity = async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;  
  
    const cart = await Cart.findOne({ userId: req.session.user });
    
    if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
    }

   
    const cartItem = cart.items.find(item => item.productId.toString() === productId);
    
    if (!cartItem) {
        return res.status(404).json({ message: 'Item not found in cart' });
    }

  
    const product = await Product.findById(productId);  
    const salePrice = product.salePrice; 

   
    cartItem.quantity = quantity;
    cartItem.totalPrice = salePrice * quantity;  

  
    await cart.save();

   
    const cartTotal = cart.items.reduce((total, item) => {
        return total + item.totalPrice; 
    }, 0);

    
    res.json({
        itemTotalPrice: cartItem.totalPrice,  
        cartTotal: cartTotal,               
    });
};
const Checkout = async (req, res) => {
    try {
        const userId = req.session.user; 
        const coupons =req.session.appliedCoupon || null;
        console.log(coupons);

        const cart = await Cart.findOne({ userId: userId }).populate('items.productId'); 

        if (!cart || cart.items.length === 0) {
            return res.redirect('/shop');
        }

        const user = await User.findById(userId); 
        const addressData = await Address.findOne({ userId }).lean(); 

        const regularPriceTotal = cart.items.reduce((total, item) => {
            const regularPrice = item.productId.regularPrice || 0; 
            return total + (regularPrice * item.quantity); 
        }, 0);
        const cartTotal=cart.items.reduce((total, item) => total + item.totalPrice, 0)
        const offer=regularPriceTotal-cartTotal;
        
        res.render('checkout', {
            user,
            cartItems: cart.items,
            userAddresses: addressData ? addressData.address : [],
            subtotal: regularPriceTotal, 
            cartTotal:cartTotal,
            offer,
            coupons,
        });
    } catch (error) {
        console.error('Error fetching cart or user data:', error);
        res.status(500).send('Server error');
    }
};

const getCartCount = async (req, res) => {
    try {
        const userId = req.session.user; 
        if (!userId) {
            return res.json({ count: 0 });
        }

        const cart = await Cart.findOne({ userId });
        const totalCount = cart 
            ? cart.items.reduce((total, item) => total + item.quantity, 0) 
            : 0;

        res.json({ count: totalCount });
    } catch (error) {
        console.error("Error fetching cart count:", error);
        res.status(500).json({ count: 0 });
    }
};


module.exports= {
   
    addToCart,
    getCart,
    removeFromCart,
    changeQuantity,
    Checkout,
    getCartCount
}