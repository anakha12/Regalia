const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const session = require('express-session');
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { redirect } = require('express/lib/response');


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP ${otp}</b>`,
        });

        return info.accepted.length > 0;

    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        
        if (!userId) return res.redirect("/login");

        const userData = await User.findById(userId);
        if (!userData) return res.redirect("/pageNotFound");
        const addressData= await Address.findOne({userId:userId});
        res.render('profile', {
            user: userData,
            userAddress:addressData,
        });
    } catch (error) {
        console.error("Error retrieving user data:", error);
        res.redirect("/pageNotFound");
    }
};

const loadEditProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) return res.redirect("/login");

        const userData = await User.findById(userId);
        if (!userData) return res.redirect("/pageNotFound");

        res.render('edit-profile', {
            user: userData,
        });
    } catch (error) {
        console.error("Error retrieving user data:", error);
        res.redirect("/pageNotFound");
    }
};

const changeEmail = async (req, res) => {
    try {
        res.render('change-email', { user: req.session.user});
    } catch (error) {
        res.redirect("/pageNotFound");
    }   
};

const changeEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render('change-email-otp', { user: req.session.user || null });
                console.log("email-change", email);
                console.log("email-change-otp", otp);
            } else {
                res.json('email-error');
            }
        } else {
            res.render("change-email", { message: "Email not found", user: req.session.user || null });
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const verifyEmailOtp = async (req, res) => {
    try {
        const { enteredOtp } = req.body;
        console.log("enterd otp",enteredOtp)
        if (String(enteredOtp) === String(req.session.userOtp)) {
            const userData = req.session.userData;
            res.render('new-email', {
                userData: userData,
                user: req.session.user,
                message: null,
            });
        } else {
            res.render('change-email-otp', {
                message: "OTP does not match. Please try again.",
                userData: req.session.userData,
                user: req.session.user || null,
            });
        }
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.redirect("/pageNotFound");
    }
};
const updateEmail = async (req, res) => {
    try {
        
        const { newEmail } = req.body;
        const userId = req.session.user._id 
        const existingEmail=await User.findOne({email:newEmail});
        
        if(!existingEmail){
            const updatedUser = await User.findByIdAndUpdate(userId, { email: newEmail }, { new: true });
            if (!updatedUser) {
           
                return res.redirect('/pageNotFound');
            }
            req.session.user.email = updatedUser.email;
            res.redirect('/edit-profile');
        }else{
            res.render('new-email', {
               
                user: req.session.user,
                message:"User with this email already exists"
            });
        }
      
    } catch (error) {
        console.error("Error during email update:", error);
        res.redirect('/pageNotFound');
    }
};

const changePassword=async(req,res)=>{
    try {
        res.render('change-password', { user: req.session.user || null });
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}
const changePasswordValid=async(req,res)=>{
    try {
        const { email } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render('change-password-otp', { user: req.session.user || null });
               
                console.log("OTP", otp);
            } else {
                res.json({
                    success:false,
                    message:"Failed to send otp.Please try again",
                });
            }
        } else {
            res.render("change-password", { message: "User with this email does not exists", user: req.session.user || null });
        }
    } catch (error) {
        console.error(error)
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

const verifyPasswordOtp=async(req,res)=>{
    try {
        const { otp } = req.body;
        console.log("enterd otp",otp)
        if (String(otp) === String(req.session.userOtp)) {
           res.json({success:true,redirectUrl:'/reset-password'})
        }else{
            res.json({success:false,message:"Otp not matching"})
        } 
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

const getResetPassPage = async (req, res) => {
    try {
        const user = req.session.user; 
        console.log(user)
        res.render('reset-password', { 
            user,
            message: req.flash('message') || null 
        });
    } catch (error) {
        console.error("Error in getResetPassPage:", error);
        res.redirect("/pageNotFound");
    }
};

const postNewPassword = async (req, res) => {
    try {
        
        const { userId, newPassword, confirmPassword } = req.body;
        
        
        if (newPassword !== confirmPassword) {
            req.flash('message', 'Passwords do not match');
            return res.redirect('/reset-password');
        }

        
        const hashedPassword = await securePassword(newPassword);

        
        const user = await User.findById(userId);  
        if (!user) {
            req.flash('message', 'User not found');
            return res.redirect('/reset-password');
        }

        
        user.password = hashedPassword;
        await user.save();

        console.log('Password updated successfully');
        res.redirect('/edit-profile');  

    } catch (error) {
        console.error('Error in postNewPassword:', error);
        req.flash('message', 'An error occurred while resetting password');
        res.redirect('/reset-password');
    }
};

const postEditProfile = async (req, res) => {
    try {
       
        const { name, phone } = req.body;
        const userId = req.session.user._id; 

        
        if (!name || !/^[a-zA-Z\s]+$/.test(name)) {
            req.flash('error', 'Please enter a valid name.');
            return res.redirect('/edit-profile');
        }
        if (phone && !/^\d{10}$/.test(phone)) {
            req.flash('error', 'Please enter a valid 10-digit phone number.');
            return res.redirect('/edit-profile');
        }

        
        await User.findByIdAndUpdate(userId, { name, phone }, { new: true });

        
        req.flash('success', 'Profile updated successfully.');
        res.redirect('/userProfile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', 'An error occurred while updating your profile. Please try again.');
        res.redirect('/edit-profile');
    }
};

const addAddress=async(req,res)=>{
    try {
        const user=req.session.user;
        res.render('add-address',{user:user})
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const addAddressCart=async(req,res)=>{
    try {
        const user=req.session.user;
        res.render('add-address-cart',{user:user})
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}

const addAddressPost= async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone}=req.body;
        const userAddress=await Address.findOne({userId:userData._id});
        if(!userAddress){
            const newAddress= Address({
            userId:userData._id,
            address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
        });
        await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }

        res.redirect('/userProfile')
    } catch (error) {
        console.error(error);

    }
    
}


const addAddressPostCart= async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone}=req.body;
        const userAddress=await Address.findOne({userId:userData._id});
        if(!userAddress){
            const newAddress= Address({
            userId:userData._id,
            address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
        });
        await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }

        res.redirect('/checkout')
    } catch (error) {
        console.error(error);

    }
    
}


const editAddress=async(req,res)=>{
    try {
        const addressId=req.query.id;
        const user=req.session.user;
        const currentAddress= await Address.findOne({"address._id":addressId});
        
        if(!currentAddress){
            return res.redirect('/pageNotFound');
        }
       const addressData=currentAddress.address.find((item)=>{
        return item._id.toString()===addressId.toString();
       })
        res.render('edit-address', { address: addressData,user });
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(500).send("Server Error");
    }
}

const editAddressPost = async (req, res) => {
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const currentAddress = await Address.findOne({ "address._id": addressId });
        if (!currentAddress) {
            return res.redirect('/pageNotFound');
        }
        const addressData = currentAddress.address.find((item) => item._id.toString() === addressId.toString());
        if (!addressData) {
            return res.redirect('/pageNotFound');
        }
        addressData.addressType = addressType;
        addressData.name = name;
        addressData.city = city;
        addressData.landMark = landMark;
        addressData.state = state;
        addressData.pincode = pincode;
        addressData.phone = phone;
        addressData.altPhone = altPhone;

        await currentAddress.save();

        res.redirect('/userProfile'); 

    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).send("Server Error");
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;  
        const user = req.session.user;
       
        const findAddress = await Address.findOne({ "address._id": addressId });
        if(!findAddress){
            return res.status(404).send("Address Not found");
        }
        const result = await Address.updateOne(
            { "address._id": addressId },
            { $pull: { address: { _id: addressId } } }
        );

        res.redirect('/userProfile');  

    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).send("Server Error");
    }
};


module.exports = {
    userProfile,
    loadEditProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyPasswordOtp,
    getResetPassPage,
    postNewPassword,
    postEditProfile,
    addAddress,
    addAddressPost,
    editAddress,
    editAddressPost,
    deleteAddress,
    addAddressPostCart,
    addAddressCart,
};
