const User = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Product= require('../../models/productSchema');
const Category=require('../../models/categorySchema');
const Order = require("../../models/orderSchema");


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render("admin-login", { message: null });
}

const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            try {
                const passwordMatch = await bcrypt.compare(password, admin.password);
                if (passwordMatch) {
                    req.session.admin = admin._id.toString();
                    return res.redirect("/admin");
                } else {
                    return res.render("admin-login", { message: "Incorrect password. Please try again." });
                }
            } catch (passwordError) {
                console.error("Password comparison error:", passwordError);
                return res.render("admin-login", { message: "An error occurred while checking the password." });
            }
        } else {
            return res.render("admin-login", { message: "Email not found or not an admin account." });
        }
    } catch (dbError) {
        console.error("Database error while finding admin:", dbError);
        return res.render("admin-login", { message: "An unexpected error occurred. Please try again later." });
    }
}


const loadDashboard = async (req, res) => {
    try {
      const topProducts = await Order.aggregate([
        { $unwind: "$Ordereditems" },
        {
          $group: {
            _id: "$Ordereditems.product",
            totalSold: { $sum: "$Ordereditems.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
      ]);
  
      const topCategories = await Order.aggregate([
        { $unwind: "$Ordereditems" },
        {
          $lookup: {
            from: "products",
            localField: "Ordereditems.product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalSold: { $sum: "$Ordereditems.quantity" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "categories", 
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        { $unwind: "$categoryDetails" },
      ]);
  
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
      const totalOrdersData = [10, 20, 30, 40, 50];
      const revenueData = [100, 200, 300, 400, 500];
  
      res.render('dashboard', {
        topProducts,
        topCategories,
        labels: [], 
        totalOrdersData: [],
        revenueData: [],
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  };
  


const pageerror = async (req, res) => {
    res.render('admin-error');
}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.redirect("/pageerror");
            }
            res.clearCookie('connect.sid');
            res.redirect('/admin/login');
        });
    } catch (error) {
        console.error("Unexpected error during logout:", error);
        res.redirect('/pageerror');
    }
}

const loadChartData = async (req, res) => {
  try {
    const { range } = req.query;

    let startDate;
    const endDate = new Date();

    if (range === "weekly") {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
    } else if (range === "monthly") {
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    } else if (range === "yearly") {
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
    }

    const ordersData = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          paymentStatus: "Success",
        },
      },
      {
        $unwind: "$Ordereditems",
      },
      {
        $match: {
          "Ordereditems.status": { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: range === "yearly"
            ? { $dateToString: { format: "%Y-%m", date: "$createdOn" } } 
            : range === "monthly"
            ? { weekOfMonth: { $ceil: { $divide: [{ $dayOfMonth: "$createdOn" }, 7] } } }
            : { $dayOfWeek: "$createdOn" }, 
          totalOrders: { $sum: 1 },
          revenue: { $sum: "$Ordereditems.totalPrice" },
        },
      },
      { $sort: { "_id.weekOfMonth": 1 } },
    ]);

    const labels = [];
    const totalOrdersData = [];
    const revenueData = [];

    if (range === "weekly") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      for (let i = 0; i < 7; i++) {
        const day = days[i];
        const match = ordersData.find((data) => data._id === i + 1);
        labels.push(day);
        totalOrdersData.push(match ? match.totalOrders : 0);
        revenueData.push(match ? match.revenue : 0);
      }
    } else if (range === "monthly") {
      for (let i = 1; i <= 4; i++) {
        const weekLabel = `Week ${i}`;
        const match = ordersData.find((data) => data._id.weekOfMonth === i);
        labels.push(weekLabel);
        totalOrdersData.push(match ? match.totalOrders : 0);
        revenueData.push(match ? match.revenue : 0);
      }
    } else if (range === "yearly") {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      for (let i = 0; i < 12; i++) {
        const yearMonth = `${endDate.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
        const match = ordersData.find((data) => data._id === yearMonth);
        labels.push(months[i]);
        totalOrdersData.push(match ? match.totalOrders : 0);
        revenueData.push(match ? match.revenue : 0);
      }
    }

    res.json({ labels, totalOrdersData, revenueData });
  } catch (err) {
    console.error("Error in loadChartData:", err);
    res.status(500).json({ labels: [], totalOrdersData: [], revenueData: [] });
  }
};



  
  

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    loadChartData,  
}
