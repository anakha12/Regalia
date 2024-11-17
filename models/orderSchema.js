const { type } = require('express/lib/response');
const mongoose=require('mongoose');
const {Schema}=mongoose;
const {v4:uuidv4}=require('uuid');
const orderSchema= new mongoose.Schema({
  
        orderId:{
            type:String,            
            default:()=>uuidv4(),
            unique:true
        },
        userId: { 
            type: Schema.Types.ObjectId,
            ref: "User2", 
            required: true
          },
          Ordereditems: [{
            product: {
              type: Schema.Types.ObjectId,
              ref: "Product",
              required: true
            },
            quantity: {
              type: Number,
              required: true
            },
            price: {
              type: Number,
              default: 0
            },
            totalPrice: {
              type: Number,
              required: true
            },
            discountPrice: {
              type: Number,
              required: true
            },
            name: {
              type: String,
              required: true
            },
            images: {
              type: [String],
              required: true
            }
          }],
          
        totalPrice:{
            type:Number,
            required:true

        },
        discount:{
            type:Number,
            default:0

        },
        finalAmount:{
            type:Number,
            required:true

        },
        address: {
            type: Schema.Types.ObjectId,
            ref: "Address",  
            required: true
        },
        
        invoiceDate:{
            type:Date
        },
        status: {
            type: String,
            required: true,
            enum: ['Pending','Processing', 'Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']
        },
        
        createdOn:{
            type:Date,
            default:Date.now,
            required:true

        },
        couponApplied:{
            type:Boolean,
            default:false
        }
  
})

const Order= mongoose.model('Order',orderSchema);
module.exports=Order;