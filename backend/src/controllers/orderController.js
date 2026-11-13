import Order from "../models/orderModel.js";
import Product from "../models/product.model.js";

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.userId || req.user._id;

    const productIds = orderItems.map((item) => item.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    if (dbProducts.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products not found",
      });
    }

    let itemsPrice = 0;
    const verifiedItems = [];

    // Stock verification & deduction
    for (const item of orderItems) {
      const product = dbProducts.find((p) => p._id.toString() === item.product);

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      product.stock -= item.quantity;
      await product.save();

      itemsPrice += product.price * item.quantity;
      verifiedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const shippingPrice = itemsPrice > 1000 ? 0 : 150;
    const totalAmount = itemsPrice + shippingPrice;

    const order = await Order.create({
      user: userId,
      orderItems: verifiedItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalAmount,
      paymentStatus: "Pending",
      orderStatus: "Processing",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to place order",
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user._id;
    const userRole = req.user.role;

    const order = await Order.findById(id).populate("user", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security check: Customer sirf apna order dekh sakta hai
    if (
      userRole !== "admin" &&
      order.user._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch order",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (
      order.orderStatus === "Cancelled" ||
      order.orderStatus === "Delivered"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of an order that is already ${order.orderStatus}`,
      });
    }

    if (
      orderStatus === "Delivered" &&
      order.paymentMethod === "Card" &&
      order.paymentStatus !== "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark an unpaid Card order as Delivered.",
      });
    }

    order.orderStatus = orderStatus;

    if (orderStatus === "Delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "Completed";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${orderStatus}`,
      order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user._id;
    const isAdmin = req.user.role === "admin";

    const order = await Order.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (["Shipped", "Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.orderStatus}`,
      });
    }

    if (
      order.paymentMethod === "Card" &&
      order.paymentStatus === "Completed" &&
      order.paymentResult?.id
    ) {
      await stripe.refunds.create({
        payment_intent: order.paymentResult.id,
      });
      order.paymentStatus = "Refunded";
    }

    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message:
        order.paymentStatus === "Refunded"
          ? "Order cancelled and payment refunded successfully"
          : "Order cancelled and stock restored",
      order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPaymentIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.paymentMethod === "COD") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot generate Stripe payment intent for Cash on Delivery orders.",
      });
    }

    if (order.paymentStatus === "Paid") {
      return res
        .status(400)
        .json({ success: false, message: "Order is already paid" });
    }

    // Stripe smallest currency unit leta hai (cents / paisas) -> * 100
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "usd", // ya "pkr" agar account support kare
      metadata: { orderId: order._id.toString() },
    });

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    return res.status(200).json({ received: true });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(200).json({ received: true });
    }

    // 1. Payment Succeeded Case
    if (event.type === "payment_intent.succeeded") {
      // Idempotency check: agar pehle se Completed hai toh dobara update na karo
      if (order.paymentStatus !== "Completed") {
        order.paymentStatus = "Completed";
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
        };
        await order.save();
        console.log(`Order ${orderId} marked as Completed via Stripe Webhook`);
      }
    }

    // 2. Payment Failed Case
    if (event.type === "payment_intent.payment_failed") {
      order.paymentStatus = "Failed";
      order.paymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
      };
      await order.save();
      console.log(`Payment failed for Order ${orderId}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook DB Update Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderStatus, paymentStatus } = req.query;

    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalOrders = await Order.countDocuments(filter);

    return res.status(200).json({
      success: true,
      totalOrders,
      totalPages: Math.ceil(totalOrders / Number(limit)),
      currentPage: Number(page),
      orders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
