const express= require('express');
const app= express();
const path= require('path');
const env=require('dotenv').config();
const session=require('express-session');
const passport= require('./config/passport');
const db= require('./config/db');
const userRouter= require('./routes/userRouter');
const req = require('express/lib/request');
const flash = require('connect-flash');
const adminRouter=require('./routes/adminRouter');
const Razorpay = require("razorpay");

db();


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    },
    message:""
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session())

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

app.use((req,res,next)=>{
    res.set('cache-control','no-store');
    next();
})

app.set('view engine','ejs')
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")));


app.use('/',userRouter);

app.use('/admin',adminRouter);


app.listen(process.env.PORT, ()=>{
    console.log('server running');
});

module.exports= app;