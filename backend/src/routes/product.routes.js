import {
  createProductController,
  getProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from "../controllers/product.controller.js";
import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createProductSchema } from "../validations/product.validation.js";
import { updateProductSchema } from "../validations/product.validation.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  validate(createProductSchema),
  createProductController
);
router.get("/", getProductsController);
router.get(
  "/:id",
  authenticate,
  getProductByIdController
);
router.patch(
  "/:id",
  validate(updateProductSchema),
  updateProductController
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteProductController
);

export default router;