import express from "express";
import {
  cancelOrder,
  createOrder,
  createPaymentIntent,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createOrderSchema,updateOrderStatusSchema } from "../validations/orderValidation.js";

const router = express.Router();


router.get("/my-orders", authenticate, getMyOrders);
router.post("/", authenticate, validate(createOrderSchema), createOrder);
router.get("/webhook", (req, res) => {
  res.set("Allow", "POST");
  return res.status(405).json({
    success: false,
    message: "Stripe webhook expects a POST request",
  });
});
router.get("/:id", authenticate, getOrderById);
router.post("/:id/pay", authenticate, createPaymentIntent);
router.patch("/:id/cancel", authenticate, cancelOrder);
router.patch(
  "/:id/status",
  authenticate,
  validate(updateOrderStatusSchema),
  updateOrderStatus
);
export default router;