import {
  registerUser,
  loginUser,
  getUserById,
  getUserByEmail,
} from "../services/auth.service.js";
import { hashToken } from "../services/auth.service.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import jwt from "jsonwebtoken";
import RefreshToken from "../models/refreshToken.model.js";
import User from "../models/user.model.js";
import redisClient from "../config/redis.js";
import { incrementTokenVersion } from "../config/redis.js";

export const registerController = async (req, res) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.log("ERROR NAME:", error.name);
    console.log("ERROR MESSAGE:", error.message);
    console.log("ERROR CODE:", error.code);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const user = await loginUser(req.body);

    const key = `user:${user._id}:tokenVersion`;

    let tokenVersion = await redisClient.get(key);

    if (tokenVersion === null) {
      tokenVersion = "1";
      await redisClient.set(key, tokenVersion);
    }

    const accessToken = generateAccessToken({
      ...user.toObject(),
      tokenVersion: Number(tokenVersion),
    });

    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.log("ERROR NAME:", error.name);
    console.log("ERROR MESSAGE:", error.message);
    console.log("ERROR CODE:", error.code);

    if (error.message === "Invalid credentials") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

export const refreshController = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenHash = hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      tokenHash,
      userId: decoded.userId,
      revokedAt: null,
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or revoked refresh token",
      });
    }

    const user = await getUserById(decoded.userId);

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const key = `user:${user._id}:tokenVersion`;
const tokenVersion = await redisClient.get(key);

const accessToken = generateAccessToken({
  ...user.toObject(),
  tokenVersion: Number(tokenVersion),
});
    const newRefreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to refresh access token",
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const tokenHash = hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or already revoked refresh token",
      });
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    await incrementTokenVersion(storedToken.userId);
    
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

export const googleCallbackController = async (req, res) => {
  try {
    const { email, name, googleId } = req.user;

    let user = await getUserByEmail(email);

    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: "google",
        googleId,
        role: "customer",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    console.log("REFRESH TOKEN:", refreshToken);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.log("GOOGLE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const githubCallbackController = async (req, res) => {
  try {
    const { email, name, githubId } = req.user;

    let user = await getUserByEmail(email);

    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: "github",
        githubId,
        role: "customer",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.log("GITHUB ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
