const express = require("express");
const router = express.Router();
const {
  getConversation,
  sendMessage,
  deleteMessage,
  getRecentChats,
  markAsRead,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/recent", protect, getRecentChats);
router.get("/:userId", protect, getConversation);
router.post("/send", protect, upload.single("file"), sendMessage);
router.delete("/message/:id", protect, deleteMessage);
router.put("/read/:userId", protect, markAsRead);

module.exports = router;
