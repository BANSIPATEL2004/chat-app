import express from "express";
import { 
  createGroup, getMyGroups, getGroupById, deleteGroup, leaveGroup, 
  addMember, removeMember, pinMessage, unpinMessage, updateGroup 
} from "../controllers/groupController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:id", getGroupById);
router.delete("/:id", deleteGroup);
router.post("/:id/leave", leaveGroup);
router.post("/add-member", addMember);
router.post("/remove-member", removeMember);
router.post("/:groupId/pin/:messageId", pinMessage);
router.post("/:groupId/unpin/:messageId", unpinMessage);

export default router;
