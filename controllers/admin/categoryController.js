const User = require("../../models/userSchema");
const Category=require('../../models/categorySchema');
const { redirect, status } = require("express/lib/response");
const Product= require('../../models/productSchema')


const categoryInfo = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    
    try {
        let categoryData, totalCategories;
        
        
        try {
            categoryData = await Category.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
        } catch (fetchError) {
            console.error("Error fetching category data:", fetchError);
            return res.redirect('/pageerror');
        }

      
        try {
            totalCategories = await Category.countDocuments();
        } catch (countError) {
            console.error("Error counting categories:", countError);
            return res.redirect('/pageerror');
        }

        const totalPages = Math.ceil(totalCategories / limit);

        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });

    } catch (error) {
        console.error("Unexpected error in categoryInfo:", error);
        res.redirect('/pageerror');
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;
   
    let existingCategory;
    try {
        existingCategory = await Category.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }
    } catch (error) {
        console.error("Error finding category:", error);
        return res.status(500).json({ error: "Error checking for existing category" });
    }

    try {
        const newCategory = new Category({
            name,
            description,
        });
        await newCategory.save();
        return res.status(201).json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error saving new category:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const addCategoryOffer = async (req, res) => {

    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const maxDiscount=req.body.maxDiscount;

    try {

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        const hasHigherProductOffer = products.some(product => product.productOffer > percentage);
        if (hasHigherProductOffer) {
            return res.status(400).json({
                status: false,
                message: "A product in this category already has a higher product offer",
            });
        }

        category.categoryOffer = percentage;
        await category.save();

        for (const product of products) {
            if (product.productOffer === 0) {
                if(product.regularPrice - Math.floor(product.regularPrice * (percentage / 100))<100){
                    product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
                }else{
                    product.salePrice=product.regularPrice-maxDiscount;
                }
            }
            await product.save();
        }

        res.json({ status: true, message: "Category offer applied successfully" });
    } catch (error) {
        console.error("Error in addCategoryOffer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};



const removeCategoryOffer = async (req, res) => {

    const categoryId = req.body.categoryId;
    
    let category;
    try {
        
        category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
    } catch (error) {
        console.error("Error finding category:", error);
        return res.status(500).json({ status: false, message: "Error finding category" });
    }

    const percentage = category.categoryOffer;
    let products;
    try {
        products = await Product.find({ category: category._id });
    } catch (error) {
        console.error("Error retrieving products:", error);
        return res.status(500).json({ status: false, message: "Error retrieving products" });
    }

    try {
 
        if (products.length > 0) {
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }
    } catch (error) {
        console.error("Error updating product prices:", error);
        return res.status(500).json({ status: false, message: "Error updating product prices" });
    }

    try {
        category.categoryOffer = 0;
        await category.save();
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ status: false, message: "Error updating category" });
    }

    res.json({ status: true });
};


const getListCategory= async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const getUnlistCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const getEditCategory= async (req,res)=>{
    try {
        let id=req.query.id;
       const category= await Category.findOne({_id:id});
        res.render("edit-category",{category:category});
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const editCategory= async(req,res)=>{
    try {
        
        let id = req.params.id;
       const {categoryName,description}=req.body;
       const existingCategory = await Category.findOne({
        name: categoryName,
        _id: { $ne: id }
      });
      
       if(existingCategory){
         return res.status(400).json({error:"Category exists, please choose another name"});
       }
       const updateCategory=await Category.findByIdAndUpdate(id,{
         name:categoryName,
         description:description,
       },{new:true});
       if(updateCategory){
        res.status(200).json({message:"category updated"});
        
       }else{
        res.status(404).json({error:"category not found"})
       }
    } catch (error) {
        console.error(error);
        res.status(500).json({error:"Internal server error"})
    }
}

module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer, 
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
}