import Order from "../models/orderModel.js";
import Product from "../models/productModel.j";

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