const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");

const getAllOrders = async (req, res) => {
    try {
      const orders = await Order.find()
        .populate('userId', 'email') 
        .populate('Ordereditems.product', 'productName totalPrice images') 
        .populate('address')
        .exec();
  
     
  
      // Pass orders to the view
      res.render('order-admin', { orders ,user: req.user});
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const updateOrderStatus = async (req, res) => {
    const { orderId, newStatus } = req.body;

    try {
        const validStatuses = ['Pending','Processing', 'Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: newStatus },
            { new: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order status updated successfully', updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const cancelOrder = async (req, res) => {
   
    const { orderId,productId,quantity } = req.body;

    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: "Cancelled" },
            { new: true } 
        );

 
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        const product = await Product.findById(productId);
        const orderedItem = updatedOrder.Ordereditems.find(item => item.product._id.toString() === productId);
        if (!orderedItem) {
            return res.status(404).json({ success: false, message: "Product not found in order." });
        }

       
        product.quantity += orderedItem.quantity;

       
        await product.save();

        res.json({ success: true, message: "Order has been cancelled", updatedOrder });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};




module.exports = { 
    getAllOrders,
    updateOrderStatus,
    cancelOrder
 };
