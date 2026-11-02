import express from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../validations/auth.validation.js";
import passport from "passport";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  googleCallbackController,
  githubCallbackController,
  logoutAllController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/register", validate(registerSchema), registerController);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallbackController,
);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
  }),
  githubCallbackController,
);

router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);
router.post("/logout-all", authenticate, logoutAllController);

router.get(
  "/profile",
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

router.get(
  "/customer",
  authenticate,
  authorize("customer"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Customer",
    });
  }
);

export default router;
