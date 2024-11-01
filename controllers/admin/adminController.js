const User = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Load login page
const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render("admin-login", { message: null });
}

// Admin login handler
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin");
            } else {
                // Wrong password, handle here (can display a message)
                return res.redirect('/admin/login');
            }
        } else {
            // No such admin, handle here (can display a message)
            return res.redirect('/login');
        } 
    } catch (error) {
        console.error("Login error:", error);
        return res.redirect("/pageerror");
    }
}

// Load dashboard
const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render('dashboard');
        } catch (error) {
            console.error("Dashboard error:", error);
            res.redirect("/pageerror");
        }
    } else {
        res.redirect('/admin/login');
    }
}

// Error page handler
const pageerror = async (req, res) => {
    res.render('admin-error');
}

// Logout handler
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



module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}
