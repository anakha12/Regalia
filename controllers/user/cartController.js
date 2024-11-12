const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const session = require('express-session');
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { redirect } = require('express/lib/response');

const showCart= async(req,res)=>{
    try {
        res.render('shopping-cart', { user: req.session.user || null });
    } catch (error) {
        res.render('/pageNotFound')
    }
}

const showPayment=async(req,res)=>{
    try {
        res.render('checkout', { user: req.session.user || null });
    } catch (error) {
        res.render('/pageNotFound')
    }
}
module.exports= {
    showCart,
    showPayment,
}