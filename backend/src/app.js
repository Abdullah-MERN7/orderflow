import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import productRoutes from "./routes/product.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { handleStripeWebhook } from "./controllers/orderController.js";
import orderRoutes from "./routes/order.routes.js";

const app = express();

app.use(cors());

app.post(
  "/api/orders/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);
app.use(express.json());

app.use("/api/health", healthRoutes);

app.use("/api/products", productRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/orders", orderRoutes);

export default app;
