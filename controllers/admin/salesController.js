const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const moment = require('moment');

const getSales = async (req, res) => {
    try {
 
  
      const { filter } = req.query;
      const validFilters = ['daily', 'weekly', 'monthly', 'yearly'];
      const selectedFilter = validFilters.includes(filter) ? filter : 'daily';
  
      const now = new Date();
      let startDate;
  
      switch (selectedFilter) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0)); // Start of the day
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the week
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1); // Start of the year
          break;
      }
  
      const orders = await Order.find({ 
        createdOn: { $gte: startDate },
        paymentStatus: 'Success',
        'Ordereditems.status': { $ne: 'Returned' },
    }).populate('userId');

  
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
      const revenueAfterDiscount = totalRevenue - totalDiscount;
  
      const statusCounts = orders.reduce((counts, order) => {
        counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
      }, {});
      
      const paymentMethods = orders.reduce((counts, order) => {
        counts[order.paymentMethod] = (counts[order.paymentMethod] || 0) + 1;
        return counts;
      }, {});
  
      return res.render('sales', {
        error: null,
        filter: selectedFilter,
        totalOrders,
        totalRevenue,
        totalDiscount,
        revenueAfterDiscount,
        statusCounts,
        paymentMethods,
        orders,
        moment, 
      });
    } catch (error) {
      console.error('Error in getSales controller:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  
  
  

module.exports={
    getSales, 
}