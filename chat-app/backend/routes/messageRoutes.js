import express from "express";
import {
  sendMessage,
  sendGroupMessage,
  getMessages,
  getGroupMessages,
  getConversations,
  deleteMessage,
  clearChat,
  toggleReaction,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All message routes are protected

router.get("/conversations", getConversations);
router.get("/:userId", getMessages);
router.get("/group/:groupId", getGroupMessages);
router.post("/send/:receiverId", sendMessage);
router.post("/send/group/:groupId", sendGroupMessage);
router.delete("/clear/:id", clearChat);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/reaction", toggleReaction);

export default router;
