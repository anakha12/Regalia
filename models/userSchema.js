const { type } = require('express/lib/response');
const mongoose=require('mongoose');
const {Schema}=mongoose;


const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null,
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    },
    password:{
        type:String,
        required:false,
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false,
    },
    couponApplied: [
        {
          couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            
          },
          usedCount:{
            type:Number
            
          }
        },
      ],
},{timestamps:true})

const User=mongoose.model("User2",userSchema);
module.exports=User