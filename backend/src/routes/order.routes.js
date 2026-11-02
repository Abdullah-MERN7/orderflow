import express from "express";
import { createOrderSchema,updateOrderStatusSchema } from "../validations/orderValidation.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  cancelOrder,
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", authenticate, validate(createOrderSchema), createOrder);

router.get("/my-orders", authenticate, getMyOrders);
router.get("/:id", authenticate, getOrderById);
router.patch(
  "/:id/status",
  authenticate,
  validate(updateOrderStatusSchema),
  updateOrderStatus
);
router.patch("/:id/cancel", authenticate, cancelOrder);
export default router;