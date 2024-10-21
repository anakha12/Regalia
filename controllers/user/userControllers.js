const { send, redirect, json, render } = require('express/lib/response');
const User=require('../../models/userSchema');
const Category=require('../../models/categorySchema');
const Product=require('../../models/productSchema')
const env= require('dotenv').config();
const nodemailer= require('nodemailer');
const bcrypt= require('bcrypt')


const pageNotFound= async(req,res)=>{
    try {
         res.render('page-404');
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}


const loadHome = async (req, res) => {
    try {
        const user = req.session.user;
        const categories=await Category.find(({isListed:true}));
        let productData= await Product.find(
            {isBlocked:false,
                category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
            }
        )

        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        productData=productData.slice(0,4);



        const userData = user ? await User.findOne({ _id: user._id }) : null;
        res.render('home', { user: userData ,products:productData});
    } catch (error) {
        console.log('Home page not found', error);
        res.status(500).send('Server error');
    }
};

const loadShop = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });

        // Fetch products that belong to the listed categories and have available quantity
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });

        // Sort products by creation date (newest first)
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        // Optionally, you can slice or paginate the products
        // productData = productData.slice(0, 4); // Uncomment if needed

        // Fetch user data if the user is logged in
        const userData = user ? await User.findOne({ _id: user._id }) : null;

        // Render the shop page with user, categories, and products data
        res.render('shop', { user: userData, categories, products: productData });
    } catch (error) {
        console.log('Shop page not found', error);
        res.status(500).send('Server error');
    }
};

const loadShopDetails = async (req, res) => {
    try {
        const productId = req.params.productId;  // Get the product ID from the URL
        const product = await Product.findOne({ _id: productId, isBlocked: false });

        // Handle case if the product is not found
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const categories = await Category.find({ isListed: true });
        const user = req.session.user ? await User.findOne({ _id: req.session.user._id }) : null;

        // Render the shop-details page with product details, user, and categories
        res.render('shop-details', { user, categories, product });
    } catch (error) {
        console.error('Error loading product details', error);
        res.status(500).send('Server error');
    }
};


const loadSignup= async(req,res)=>{
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Home page not found',error);
        res.status(500).send('Server error')
        
    }
}

const loadLogin= async(req,res)=>{
    try {
        if(!req.session.user){
            const message = ""; // Initialize with an empty string if no message
            res.render('login',{message});
        }else{
            res.redirect('/');
        }
        
    } catch (error) {
        res.redirect("pageNotFound")    
        
    }
}

const loadShopping= async(req,res)=>{
    try {
        return res.render('home');
    } catch (error) {
        console.log('Home page not found');
        res.status(500).send('Server error')
        
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sendVerificationEmail(email,otp) {
    try {
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info=await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP ${otp}</b>`,
        })

        return info.accepted.length>0

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}

const signup=async(req,res)=>{
    
    try {
        const {name,email,phone,password,cPassword}=  req.body;

        if(password!==cPassword){
            return res.render("signup",{message:'Password don not match'})
        }

        const findUser=await User.findOne({email});

        if(findUser){
            return res.render('signup',{message:'email already exits'})
        }

        const otp= generateOtp();
        const emailSent=await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json('email-error')
        }
        req.session.userOtp=otp;
        req.session.userData={email,password,name,phone};

        res.render("verify-otp");   
        console.log("OTP Sent",req.session.userOtp)

    } catch (error) {
        console.error('signup error',error);
        res.redirect('/pageNotFound');  
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error('Password hashing failed');
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Received OTP:", otp);

        // Ensure OTP and session OTP are both strings before comparison
        if (String(otp) === String(req.session.userOtp)) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                googleId: user.googleId || null 
            });

            await saveUserData.save();

            // Save user ID to sessio
            
           
            res.json({ success: true, message: "OTP verified successfully", redirectUrl: '/login' });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, message: "An error occurred while verifying OTP" });
    }
};

const resendOtp= async(req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp=generateOtp();
        req.session.userOtp=otp;

        const emailSent= await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log('Resend OTP:',otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Faiiled to resend OTP, Please try again"})
        }

    } catch (error) {
        console.log("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

const login=async(req,res)=>{
    try {
        
        const {email,password}=req.body;
    
        const findUser= await User.findOne({isAdmin:0,email:email});
        
        if(!findUser){
            return res.render('login',{message:"User not found  "})
        }
        
        if(findUser.isBlocked){
            return res.render('login',{message:"User is Blocked by admin"})
        }

        const passwordMatch=  bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }

        req.session.user = {
            _id: findUser._id,
            name: findUser.name, // Include the name to be used in the header
            email: findUser.email,
            // Add any other fields you might need
        };
        
        // console.log("Attempting to log in:", email);

        res.redirect('/')

    } catch (error) {
        console.error("Login error",error);
        res.render('login',{message:"login failed please try again later"});
    }
}

const logout=async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.log("logout error",error);
        res.redirect("/pageNotFound");
    }
}

module.exports={
    pageNotFound,
    loadHome,
    loadLogin,
    loadShopping,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    login,
    logout,
    loadShop,
    loadShopDetails,
}