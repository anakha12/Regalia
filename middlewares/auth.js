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

const adminAuth = (req, res, next) => {
    // Add headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    User.findOne({ isAdmin: true })
        .then(data => {
            if (data) {
                next();     
            } else {
                res.redirect('/admin/login');
            }
        })
        .catch(error => {
            console.log("Error in admin auth middleware:", error);
            res.status(500).send("Internal server error");
        });
};

module.exports = {
    userAuth,
    adminAuth
};
