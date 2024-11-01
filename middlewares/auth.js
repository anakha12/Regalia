const User= require('../models/userSchema');

const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log('Error in user auth middleware');
            res.status(500).send("Internal server error");
        })
    }else{
        res.redirect('/login')
    }
}

const adminAuth=(req,res,next)=>{
    
    // Add headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error=>{
        console.log("Eroor in adminauth middleware",error);
        res.status(500).send("Internal server error");
    })
}


module.exports={
    userAuth,
    adminAuth
}