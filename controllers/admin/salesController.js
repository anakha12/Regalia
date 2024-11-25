const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const moment = require('moment');

const getSales = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query; 
    const validFilters = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
    const selectedFilter = validFilters.includes(filter) ? filter : 'daily';

    let start = new Date();
    let end = new Date();

    switch (selectedFilter) {
      case 'daily':
        start = new Date(start.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        start = new Date(start.setDate(start.getDate() - start.getDay()));
        break;
      case 'monthly':
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(start.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          return res.render('sales', { 
            error: 'Please provide both start and end dates for custom range.',
            filter: selectedFilter,
            totalOrders: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            revenueAfterDiscount: 0,
            statusCounts: {},
            paymentMethods: {},
            orders: [],
            moment,
          });
        }
        break;
    }

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      paymentStatus: 'Success',
    })
      .populate('userId')
      .populate('Ordereditems.product');

    const totalOrders = orders.length;

    let totalRevenue = 0;
    let totalDiscount = 0;

    const statusCounts = {};

    orders.forEach(order => {
      order.Ordereditems.forEach(item => {
        if (item.status !== 'Cancelled' && item.status !== 'Returned') {
          totalRevenue += item.totalPrice || 0;
        }
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });

      totalDiscount += order.discount || 0;
    });

    const revenueAfterDiscount = totalRevenue - totalDiscount;

    const paymentMethods = orders.reduce((counts, order) => {
      counts[order.paymentMethod] = (counts[order.paymentMethod] || 0) + 1;
      return counts;
    }, {});

    return res.render('sales', {
      error: null,
      filter: selectedFilter,
      startDate,
      endDate,
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


module.exports = {
  getSales,
};
