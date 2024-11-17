const mongoose = require('mongoose');
const User = require('../models/userSchema');

const userAuth = async (req, res, next) => {
   

    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (user && !user.isBlocked) {
               
                req.user = user;  
                return next(); 
            } else {
                
                return res.status(403).send('Access denied: User is blocked');
            }
        } catch (error) {
            console.error('Error in user auth middleware:', error);
            return res.status(500).send("Internal server error");
        }
    } else {
       
        return res.redirect('/login');
    }
};

const adminAuth = async (req, res, next) => {
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

   
    if (req.session.admin) {
       
        try {
            
            const admin = await User.findById(req.session.admin);
            if (admin && admin.isAdmin) {
                req.admin = admin; 
                return next(); 
            } else {
               
                return res.status(403).send('Access denied: Not an admin');
            }
        } catch (error) {
            console.error('Error in admin auth middleware:', error);
            return res.status(500).send("Internal server error");
        }
    } else {
      
        return res.redirect('/admin/login');
    }
};

module.exports = {
    userAuth,
    adminAuth
};
