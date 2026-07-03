import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import { sendSuccess, sendError } from "../utils/response.js";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    let { username, email, password } = req.body;

    if (!username || !email || !password) {
      return sendError(res, 400, "Please provide username, email, and password.");
    }

    username = username.trim();
    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return sendError(res, 400, "Email already registered.");
      }
      return sendError(res, 400, "Username already taken.");
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);

    return sendSuccess(res, 201, "Account created successfully!", {
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, "Please provide email and password.");
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    return sendSuccess(res, 200, "Login successful!", { user, token });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, "User fetched successfully.", { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
      socketId: null,
    });
    return sendSuccess(res, 200, "Logged out successfully.");
  } catch (error) {
    next(error);
  }
};
