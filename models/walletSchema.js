const mongoose = require("mongoose");
const {Schema}=mongoose;
const {v4:uuidv4}=require('uuid');
const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transaction: [
        {
            amount: {
                type: Number,
                required: true,
            },
            description: {
                type: String,
                default: "Not added"
            },
            transactionId: {
                type: String,
                default:()=>uuidv4(),
                required: true,
                unique: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            type: {
                type: String,
                enum: ['credit', 'debit'],
                default: 'credit'
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;