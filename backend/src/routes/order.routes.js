import express from "express";
import { createOrder } from "../controllers/orderController.js";
import { createOrderSchema } from "../validations/orderValidation.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post("/", authenticate, validate(createOrderSchema), createOrder);

export default router;