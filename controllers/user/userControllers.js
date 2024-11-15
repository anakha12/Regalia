
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
                category:{$in:categories.map(category=>category._id)},
                quantity:{$gt:0}
            }
        ).sort({ createdOn: -1 }).limit(4);

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

       
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
           
        });

      
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

      
        const userData = user ? await User.findOne({ _id: user._id }) : null;

       
        res.render('shop', { user: userData, categories, products: productData,selectedCategory:"" });
    } catch (error) {
        console.log('Shop page not found', error);
        res.status(500).send('Server error');
    }
};

const loadShopDetails = async (req, res) => {
    try {
        const productId = req.params.productId;  
        const product = await Product.findOne({ _id: productId, isBlocked: false });

       
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const categories = await Category.find({ isListed: true });
        const user = req.session.user ? await User.findOne({ _id: req.session.user._id }) : null;

       
        res.render('shop-details', { user, categories, product });
    } catch (error) {
        console.error('Error loading product details', error);
        res.status(500).send('Server error');
    }
};


// const shopFilter = async (req, res) => {
//     try {
//         const { search, categories, priceRange } = req.query;

//         let query = {};

        
//         if (search) {
//             query.productName = { $regex: search, $options: 'i' }; 
//         }

       
//         if (categories) {
//             query.category = { $in: Array.isArray(categories) ? categories : [categories] };
//         }

        
//         if (priceRange) {
//             const [min, max] = priceRange.split('-').map(Number);
//             query.salePrice = max
//                 ? { $gte: min, $lte: max } 
//                 : { $gte: min };        
//         }

    
//         const products = await Product.find(query);

       
//         const allCategories = await Category.find(); 

//         res.render('shop', { products, categories: allCategories, selectedCategories: categories });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// };







const loadSignup= async(req,res)=>{
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Home page not found',error);
        res.status(500).send('Server error');
        
    }
}

const loadLogin= async(req,res)=>{
    try {
        if(!req.session.user){
            const message = ""; 
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
            return res.render("signup",{message:'Password do not match'})
        }

        const findUser=await User.findOne({email});

        if(findUser){
            return res.render('signup',{message:'email already exits'})
        }

        const otp= generateOtp();
        const emailSent=await sendVerificationEmail(email,otp);

        if(!emailSent){
           
            return res.render('signup', { message: 'Email sending failed' });
        }
        req.session.userOtp=otp;
        req.session.userData={email,password,name,phone};

        res.render("verify-otp");   
        console.log("OTP Sent",req.session.userOtp);

    } catch (error) {
        console.error('signup error',error);
        return res.render('signup',{message:'server errror'})

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

           
            
           
            res.json({ success: true, message: "OTP verified successfully", redirectUrl: '/login' });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, message:'Server error during OTP verification' });
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

        const passwordMatch = await bcrypt.compare(password,findUser.password);
        
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"});
        }

        req.session.user = {
            _id: findUser._id,
            email: findUser.email,
        };
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
    // shopFilter,
}