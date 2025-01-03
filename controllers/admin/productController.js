const Product=require('../../models/productSchema');
const Category= require('../../models/categorySchema');

const User= require("../../models/userSchema");
const fs=require('fs');
const path= require('path');
const sharp=require('sharp');


const getProductAddPage= async(req,res)=>{
 try {
    const category=await Category.find({isListed:true});
    res.render('product-add',{
        cat:category,
    });
 } catch (error) {
    res.redirect('/pageerror');
 }
}

const addProducts=async(req,res)=>{
    try {
        const products=req.body;
        const productExists=await Product.findOne({
            productName:products.productName,

        })
        if(!productExists){
            const images=[];
            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path;
                    const resizedImagePath= path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:404,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);

                }
            }
            const categoryId= await Category.findOne({name:products.category});

            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }
            const newProduct=new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
              
                productImage:images,
                status:'Available',
            });
            await newProduct.save();
            return res.redirect('/admin/addProducts');

        }else{
            return res.status(400).json("Product already exists please try with another name");

        }
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect('/admin/pageerror')
    }
}

const getAllProducts= async(req,res)=>{
    try {
        const search=req.query.search||"";
        const page= req.query.page||1;
        const limit=4;
        const productsData= await Product.find({
            $or:[
                {productName:{$regex: new RegExp('.*'+search+'.*','i')}},
               
            ],

        }).limit(limit).skip((page-1)*limit).populate('category').exec();
        const count=await Product.find({
            $or:[
                {productName:{$regex: new RegExp('.*'+search+'.*','i')}},
                
            ],
        }).countDocuments();
        const category=await Category.find({isListed:true});
        if(category&& category.length > 0){
            res.render("products",{
                data:productsData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
            })
        }else{
            res.render("page-404")
        }
    } catch (error) {
        console.error("Error in getAllProducts:", error); 
        res.redirect("/pageerror");
    }
}

const addProductOffer= async (req,res)=>{
    try {
        const {productId,percentage}=req.body;
        const findProduct=await Product.findOne({_id:productId});
        const findCategory= await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer>percentage){
            return res.json({status:false,message:'This product  category already  has a category offer'});
        }
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100)); 
        findProduct.productOffer=parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer=0;
        await  findCategory.save();
        res.json({status:true});
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        res.status(500).json({status:false,message:"Internal server error"})
    }
}

const removeProductOffer= async(req,res)=>{
    try {
        const {productId}=req.body;
        const findProduct=await Product.findOne({_id:productId});
        const percentage=findProduct.productOffer;
        findProduct.salePrice=findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer=0;
        await findProduct.save();
        res.json({status:true})
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        const result = await Product.updateOne({_id: id}, {$set: {isBlocked: true}});
        if (result.modifiedCount === 1) {
            res.redirect('/admin/products');
        } else {
            console.error('Product not found or update failed');
            res.redirect('/pageerror');
        }
    } catch (error) {
        console.error("Error while blocking product:", error);
        res.redirect('/pageerror');
    }
};

const unblockProduct=async (req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror');
    }
}

const getEditProduct= async(req,res)=>{
    try {
        let id=req.query.id;
        const product=await Product.findOne({_id:id}).populate('category'); 
        const category= await Category.find({});
        res.render("edit-product",{
            product:product,
            categories:category,
            messages:''
        })
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const editProduct = async (req, res) => {
    try {
        let id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.render('edit-product', {
                error: "Product with this name already exists. Please try with another name",
                product: product,
                categories: await Category.find({})
            });
        }

        const hasExistingImages = product.productImage && product.productImage.length > 0;
        const uploadedImages = req.files ? req.files.map(file => file.filename) : [];

        if (!hasExistingImages && uploadedImages.length === 0) {
            return res.render('edit-product', {
                error: "Please upload at least one image.",
                product: product,
                categories: await Category.find({})
            });
        }

        const images = [];
        for (let i = 0; i < req.files.length; i++) {
            images.push(req.files[i].filename);
        }

        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            brand: data.brand,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color, // fixed typo from 'col0r' to 'color'
        };

        // Push images if any are uploaded
        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, {
            $pull: { productImage: imageNameToServer }
        });
        
        const imagePath = path.join("public", 'uploads', 're-image', imageNameToServer);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log(`Image ${imageNameToServer} not found`);
        }

        res.send({ status: true });
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};


module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
}