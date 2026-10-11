import User from "../models/user.model.js";
import RefreshToken from "../models/refreshToken.model.js";
import crypto from "crypto";

export const registerUser = async ({ name, email, password }) => {
  const user = await User.create({
    name,
    email,
    passwordHash: password,
  });

  return user;
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  return user;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const getUserByEmail = async (email) => {
  return User.findOne({ email });
};