import express from "express";
import {
  getAllUsers,
  getUserById,
  searchUsers,
  updateProfile,
  toggleStarMessage,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All user routes are protected

router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.get("/:id", getUserById);
router.put("/profile", updateProfile);
router.post("/star/:messageId", toggleStarMessage);

export default router;
