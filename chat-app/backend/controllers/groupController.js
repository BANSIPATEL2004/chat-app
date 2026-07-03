import Group from "../models/Group.js";
import Message from "../models/Message.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    console.log("Creating group:", { name, members });
    
    // Ensure all members are strings and add current user
    const memberIds = Array.isArray(members) ? members.map(m => m.toString()) : [];
    const groupMembers = [...new Set([...memberIds, req.user._id.toString()])];
    
    const group = await Group.create({
      name,
      description,
      members: groupMembers,
      admin: req.user._id,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    });

    const populatedGroup = await Group.findById(group._id).populate("members", "username email avatar");
    console.log("Group created successfully:", populatedGroup._id);
    
    return sendSuccess(res, 201, "Group created successfully.", { group: populatedGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    next(error);
  }
};

export const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "username avatar")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });
      
    return sendSuccess(res, 200, "Groups fetched successfully.", { groups });
  } catch (error) {
    next(error);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "username email avatar isOnline lastSeen")
      .populate("admin", "username email");
      
    if (!group) return sendError(res, 404, "Group not found.");
    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return sendError(res, 403, "You are not a member of this group.");
    }
    
    return sendSuccess(res, 200, "Group details fetched.", { group });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return sendError(res, 404, "Group not found.");
    
    if (group.admin.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only admins can delete the group.");
    }
    
    await Group.findByIdAndDelete(req.params.id);
    // Delete all messages in the group too
    await Message.deleteMany({ group: req.params.id });
    
    return sendSuccess(res, 200, "Group deleted successfully.");
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return sendError(res, 404, "Group not found.");
    
    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.id);
    } else {
      if (group.admin.toString() === req.user._id.toString()) {
        group.admin = group.members[0]; // Transfer admin
      }
      await group.save();
    }
    
    return sendSuccess(res, 200, "Left group successfully.");
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return sendError(res, 404, "Group not found.");
    
    if (group.admin.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only admins can add members.");
    }
    
    if (group.members.includes(userId)) {
      return sendError(res, 400, "User is already a member.");
    }
    
    group.members.push(userId);
    await group.save();
    
    const populatedGroup = await Group.findById(groupId).populate("members", "username email avatar");
    return sendSuccess(res, 200, "Member added successfully.", { group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return sendError(res, 404, "Group not found.");
    
    if (group.admin.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only admins can remove members.");
    }
    
    if (userId === group.admin.toString()) {
      return sendError(res, 400, "Admin cannot be removed. Transfer admin rights first.");
    }
    
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();
    
    const populatedGroup = await Group.findById(groupId).populate("members", "username email avatar");
    return sendSuccess(res, 200, "Member removed successfully.", { group: populatedGroup });
  } catch (error) {
    next(error);
  }
};
// @desc    Pin a message in group
// @route   POST /api/groups/:groupId/pin/:messageId
// @access  Private (Admin only)
export const pinMessage = async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return sendError(res, 404, "Group not found.");
    if (group.admin.toString() !== req.user._id.toString()) return sendError(res, 403, "Only admins can pin messages.");

    if (!group.pinnedMessages.includes(messageId)) {
      group.pinnedMessages.push(messageId);
      await group.save();
    }

    const populatedGroup = await Group.findById(groupId).populate("pinnedMessages");
    return sendSuccess(res, 200, "Message pinned successfully.", { group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Unpin a message in group
// @route   POST /api/groups/:groupId/unpin/:messageId
// @access  Private (Admin only)
export const unpinMessage = async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return sendError(res, 404, "Group not found.");
    if (group.admin.toString() !== req.user._id.toString()) return sendError(res, 403, "Only admins can unpin messages.");

    group.pinnedMessages = group.pinnedMessages.filter(m => m.toString() !== messageId);
    await group.save();

    const populatedGroup = await Group.findById(groupId).populate("pinnedMessages");
    return sendSuccess(res, 200, "Message unpinned successfully.", { group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) return sendError(res, 404, "Group not found.");
    if (group.admin.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only admins can update group details.");
    }

    if (name) {
      group.name = name;
      // Also update default avatar if it's using the old name
      if (group.avatar.includes("dicebear.com/7.x/initials/svg?seed=")) {
        group.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      }
    }
    if (description !== undefined) group.description = description;
    if (avatar) group.avatar = avatar;

    await group.save();
    
    const updatedGroup = await Group.findById(req.params.id)
      .populate("members", "username email avatar isOnline lastSeen")
      .populate("admin", "username email");

    return sendSuccess(res, 200, "Group updated successfully.", { group: updatedGroup });
  } catch (error) {
    next(error);
  }
};
