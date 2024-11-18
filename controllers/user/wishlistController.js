const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const session = require('express-session');

const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const User=require('../../models/userSchema');
const Category=require('../../models/categorySchema');

const env= require('dotenv').config();


const addToWishlist=async(req,res)=>{
    try {
        const {productId}=req.body;
        if(!productId){
            return res.status(400).send('Product ID is required')
        }
        const userId=req.session.user;

        let wishlist= await Wishlist.findOne({ userId });
        if(!wishlist){
            wishlist=new Wishlist({userId, products:[]});
        }
        const productExists = wishlist.products.some(
            (item) => item.productId.toString() === productId
        );
        if(productExists){
            return res.status(400).send('Product laready in Wishlist');
        }
        wishlist.products.push({productId });
        await wishlist.save();
        res.status(200).send('Product added to wishlist');

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).send('Internal server error');
    }
}
const getWishlist = async (req, res) => {
    try {
        const user = req.session.user; 

        if (!user) {
            return res.redirect('/login'); 
        }

        
        const wishlist = await Wishlist.findOne({ userId: user._id }).populate('products.productId');
       
        const wishlistProducts = wishlist && wishlist.products.length > 0
        ? wishlist.products.map(item => ({
            _id: item.productId._id,
            name: item.productId.productName,
            image: item.productId.productImage[0], 
            price: item.productId.salePrice,
            description:item.productId.description,
        }))
        : [];
    
           
        
        res.render('wishlist', { wishlistProducts, user });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Internal Server Error');
    }
};


const removeFromWishlist=async(req,res)=>{
    try {
        const userId = req.session.user;
        const productId = req.params.productId; 

        if (!userId) {
            return res.redirect('/login');
        }

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).send('wishlist not found');
        }

        wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId);
        await wishlist.save();
        res.redirect('/wishlist');
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).send('Failed to remove product');
    }
}

module.exports={
    addToWishlist,
    getWishlist,
    removeFromWishlist,

}