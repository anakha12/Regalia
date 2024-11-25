const User=require('../../models/userSchema');
const Wallet=require('../../models/walletSchema');
const Product=require('../../models/productSchema')
const env= require('dotenv').config();
const nodemailer= require('nodemailer');
const bcrypt= require('bcrypt')


const getWallet = async (req, res) => {
    try {
       
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login'); 
        }

        const wallet = await Wallet.findOne({ userId: user._id });

        if (!wallet) {
            return res.render('wallet', {
                walletBalance: 0, 
                transactions: [], 
                user,
            });
        }

        res.render('wallet', {
            walletBalance: wallet.totalAmount,
            transactions: wallet.transaction,
            user, 
        });
    } catch (error) {
        console.error("Error fetching wallet data:", error);
        res.status(500).send("Unable to fetch wallet data. Please try again later.");
    }
};


const addMoneyToWallet = async (req, res) => {
    try {
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login'); 
        }

        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).send("Invalid amount entered.");
        }

        let wallet = await Wallet.findOne({ userId: user._id });

        if (!wallet) {
            wallet = new Wallet({ userId: user._id, totalAmount: 0, transaction: [] });
            await wallet.save(); 
        }

        wallet.totalAmount += parseFloat(amount);
        wallet.transaction.push({
            amount: parseFloat(amount), 
            description: 'Money Added', 
            date: new Date(), 
            type: 'credit',
        });

        await wallet.save();

        res.redirect('/wallet'); 
    } catch (error) {
        console.error("Error adding money to wallet:", error);
        res.status(500).send("Unable to add money. Please try again later.");
    }
};

const getAmount=async(req,res)=>{
    try {
        const userId = req.user._id; 
        const wallet = await Wallet.findOne({ userId });

        if (wallet) {
            res.json({ totalAmount: wallet.totalAmount });
        } else {
            res.json({ totalAmount: 0 }); 
        }
    } catch (error) {
        console.error('Error fetching wallet amount:', error);
        res.status(500).json({ error: 'Failed to fetch wallet amount' });
    }
}


module.exports= {
    getWallet,
    addMoneyToWallet,
    getAmount,
}