const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const moment = require('moment');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


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
            totalCouponAmount: 0,
            totalCustomers:0,
            deliveryCharge:0,
            revenueAfterDiscount: 0,
            totalDiscountOffer:0,
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
      .populate('Ordereditems.product')
      .populate('couponApplied');

    const totalOrders = orders.length;
    const totalCustomers = await User.countDocuments();
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalCouponAmount = 0; 

    const statusCounts = {};
    const uniqueUsers = new Set();
    let final=0;
    let deliveryCharge=0;
    orders.forEach(order => {
      uniqueUsers.add(order.userId?._id.toString());
      final+=order.totalPrice;
      deliveryCharge+=order.deliveryCharge;
      order.Ordereditems.forEach(item => {
        if (item.status !== 'Cancelled' && item.status !== 'Returned') {
          totalRevenue += item.totalPrice || 0;
        }
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });

      totalDiscount += order.discount || 0;
      if (order.couponApplied) {
        totalCouponAmount += parseFloat(order.couponApplied.couponAmount) || 0;
      }
    });
   

    const revenueAfterDiscount = totalRevenue - totalDiscount-totalCouponAmount;

    const paymentMethods = orders.reduce((counts, order) => {
      counts[order.paymentMethod] = (counts[order.paymentMethod] || 0) + 1;
      return counts;
    }, {});
let totalDiscountOffer=totalDiscount+totalCouponAmount;
    return res.render('sales', {
      error: null,
      filter: selectedFilter,
      startDate,
      endDate,
      totalOrders,
      totalCustomers:uniqueUsers.size,
      totalRevenue,
      totalDiscount,
      totalCouponAmount,
      totalDiscountOffer,
      deliveryCharge,
      revenueAfterDiscount:final,
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


const calculateDateRange = (filter, startDate, endDate) => {
  let start = new Date();
  let end = new Date();

  switch (filter) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start = new Date(start.getFullYear(), 0, 1);
      end = new Date(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        throw new Error('Invalid date range for custom filter');
      }
      break;
    default:
      throw new Error('Invalid filter type');
  }

  return { start, end };
};



const downloadSalesExcel = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    const { start, end } = calculateDateRange(filter, startDate, endDate);

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      paymentStatus: 'Success',
    })
      .populate('userId')
      .populate('Ordereditems.product');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer Name', key: 'customer', width: 25 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Total Price', key: 'totalPrice', width: 15 },
    ];

    orders.forEach(order => {
      worksheet.addRow({
        orderId: order.orderId || 'N/A',
        date: moment(order.createdOn).format('DD/MM/YYYY'),
        customer: order.userId?.name || 'N/A',
        paymentMethod: order.paymentMethod || 'N/A',
        totalPrice: order.totalPrice?.toFixed(2) || '0.00',
      });
    });

    const filePath = path.join(__dirname, '../../public/sales-report.xlsx');
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, 'sales-report.xlsx', err => {
      if (err) {
        console.error('Error downloading the Excel file:', err);
        return res.status(500).send('Could not download the file');
      }
      fs.unlinkSync(filePath); 
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  getSales,
  downloadSalesExcel
};
