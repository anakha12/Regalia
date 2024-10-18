const mongoose=require('mongoose');
const { name } = require('../app');
const {Schema}=mongoose;

const brandSchema= new Schema({
    brandName:{
        type:String,
        required:true,
    },
    brandImage:{
        type:[String],
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})


const Band= mongoose.model('Brand',brandSchema);
module.exports=Brand;