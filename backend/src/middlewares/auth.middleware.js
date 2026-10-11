import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    const key = `user:${decoded.userId}:tokenVersion`;

    const currentVersion = await redisClient.get(key);

    console.log("JWT VERSION:", decoded.tokenVersion);
    console.log("REDIS VERSION:", currentVersion);

    if (
      currentVersion === null ||
      Number(currentVersion) !== Number(decoded.tokenVersion)
    ) {
      console.log("TOKEN VERSION MISMATCH");

      return res.status(401).json({
        success: false,
        message: "Access token has been revoked",
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    console.log("AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
