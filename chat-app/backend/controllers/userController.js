import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/response.js";

// @desc    Get all users (for sidebar)
// @route   GET /api/users
// @access  Private
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("-password -socketId")
      .sort({ isOnline: -1, username: 1 });

    return sendSuccess(res, 200, "Users fetched successfully.", { users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -socketId");
    if (!user) {
      return sendError(res, 404, "User not found.");
    }
    return sendSuccess(res, 200, "User fetched successfully.", { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users
// @route   GET /api/users/search?q=query
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return sendError(res, 400, "Search query is required.");
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("-password -socketId")
      .limit(10);

    return sendSuccess(res, 200, "Search results.", { users });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (username) {
      const exists = await User.findOne({
        username,
        _id: { $ne: req.user._id },
      });
      if (exists) return sendError(res, 400, "Username already taken.");
      updates.username = username;
    }
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return sendSuccess(res, 200, "Profile updated successfully.", { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle star message
// @route   POST /api/users/star/:messageId
// @access  Private
export const toggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user._id);

    const index = user.starredMessages.indexOf(messageId);
    if (index === -1) {
      user.starredMessages.push(messageId);
    } else {
      user.starredMessages.splice(index, 1);
    }

    await user.save();
    return sendSuccess(res, 200, "Star toggled successfully.", { starredMessages: user.starredMessages });
  } catch (error) {
    next(error);
  }
};
