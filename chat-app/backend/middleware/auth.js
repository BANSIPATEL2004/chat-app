import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import { sendError } from "../utils/response.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, 401, "Not authorized. No token provided.");
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, 401, "User no longer exists.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid token.");
    }
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Token has expired. Please login again.");
    }
    return sendError(res, 500, "Server error in authentication.");
  }
};
