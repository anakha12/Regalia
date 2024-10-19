const mongoose= require('mongoose');
const { name } = require('../app');
const {Schema}=mongoose;

const categorySchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true,
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    creadAt:{
        type:Date,
        default:Date.now
    }
})

const Category= mongoose.model('Category',categorySchema);
module.exports=Category;