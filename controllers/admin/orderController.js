const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");

const getAllOrders = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5; 
      const skip = (page - 1) * limit; 

      const totalOrders = await Order.countDocuments();

      const orders = await Order.find()
          .populate('userId', 'email') 
          .populate('Ordereditems.product', 'productName totalPrice images') 
          .populate('address')
          .skip(skip) 
          .limit(limit) 
          .exec();

      const totalPages = Math.ceil(totalOrders / limit);

      res.render('order-admin', { 
          orders, 
          user: req.user, 
          currentPage: page, 
          totalPages 
      });
  } catch (error) {
      console.error('Error fetching orders:', error.message);
      res.status(500).send('Internal Server Error');
  }
};

  
  const updateOrderStatus = async (req, res) => {
    const { orderId, productId, newStatus } = req.body;

    try {
        const validStatuses = ['Pending', 'Processing', 'Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, "Ordereditems.product": productId },
            { $set: { "Ordereditems.$.status": newStatus } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order or item not found' });
        }

        if (newStatus === 'Delivered') {
            const deliveredItem = order.Ordereditems.find(item => item.product.toString() === productId);
      
            if (deliveredItem && order.paymentMethod === 'Cash on Delivery') {
              order.paymentStatus = 'Success';
              await order.save();
            }
          }

  
        const allStatuses = order.Ordereditems.map(item => item.status);
        const isDelivered = allStatuses.every(status => status === 'Delivered');
        const isCancelled = allStatuses.every(status => status === 'Cancelled');

        let overallStatus = order.status;
        if (isDelivered) overallStatus = 'Delivered';
        else if (isCancelled) overallStatus = 'Cancelled';
        else if (allStatuses.some(status => status === 'Processing')) overallStatus = 'Processing';

        if (overallStatus !== order.status) {
            order.status = overallStatus;
            await order.save();
        }

        res.json({ success: true, message: 'Item status updated successfully', updatedOrder: order });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const cancelOrder = async (req, res) => {
    const { orderId, productId } = req.body;

    try {
      
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

      
        const orderedItem = order.Ordereditems.find(item => item.product.toString() === productId);
        if (!orderedItem) {
            return res.status(404).json({ success: false, message: "Product not found in order" });
        }

       
        if (orderedItem.status === "Cancelled") {
            return res.status(400).json({ success: false, message: "This product is already cancelled." });
        }
        console.log(order.paymentStatus)
        if (order.paymentStatus === "Success") {
     
            const userWallet = await Wallet.findOne({ userId: order.userId });
            if (!userWallet) {
              return res.status(404).json({ success: false, message: "Wallet not found for the user." });
            }
      
           
            userWallet.totalAmount += orderedItem.totalPrice;
            userWallet.transaction.push({
              amount: orderedItem.totalPrice,
              description: `Refund for canceled item: ${orderedItem.name}`,
              type: "credit",
            });
      
            await userWallet.save();
          }
        orderedItem.status = "Cancelled";

   
        const product = await Product.findById(productId);
        if (product) {
            product.quantity += orderedItem.quantity;
            await product.save();
        }
        
        res.json({ success: true, message: "Product has been cancelled in the order", updatedOrder: order });
    } catch (error) {
        console.error("Error cancelling product:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};




module.exports = { 
    getAllOrders,
    updateOrderStatus,
    cancelOrder
 };
