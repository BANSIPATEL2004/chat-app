import { useState, useEffect } from "react";
import { IoClose, IoTrash, IoPersonAdd } from "react-icons/io5";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import useChatStore from "../store/chatStore";
import useAuthStore from "../store/authStore";
import API from "../services/api";
import styles from "./GroupInfoModal.module.css";

export default function GroupInfoModal({ group, onClose }) {
  const { user } = useAuthStore();
  const { addGroupMember, removeGroupMember, deleteGroup } = useChatStore();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Safely extract data based on how it's stored in activeChat vs standard group object
  const groupData = group.data || group;
  const isAdmin = (groupData.admin?._id || groupData.admin) === user?._id;

  const { updateGroup } = useChatStore();

  useEffect(() => {
    if (isEditing) {
      setEditName(groupData.name);
      setEditDesc(groupData.description || "");
      setEditImage(null);
      setEditImagePreview(groupData.groupImage);
    }
  }, [isEditing, groupData]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await API.get(`/users/search?q=${search}`);
        setSearchResults(res.data);
      } catch (error) {
        console.error("Search error", error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = async (userId) => {
    if (loading) return;
    setLoading(true);
    try {
      await addGroupMember(groupData._id, userId);
      toast.success("Member added");
      setSearch("");
      setSearchResults([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (loading) return;
    setLoading(true);
    try {
      await removeGroupMember(groupData._id, userId);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    
    if (loading) return;
    setLoading(true);
    try {
      await deleteGroup(groupData._id);
      toast.success("Group deleted");
      onClose(); // Close modal, chat window will also close because activeChat becomes null
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return toast.error("Group name is required");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", editName.trim());
      fd.append("description", editDesc.trim());
      if (editImage) fd.append("groupImage", editImage);
      
      await updateGroup(groupData._id, fd);
      toast.success("Group updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setEditImage(f);
      setEditImagePreview(URL.createObjectURL(f));
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Group Info</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.groupProfile}>
            {isEditing ? (
              <div className={styles.editProfile}>
                 <label htmlFor="groupImageEdit" style={{ cursor: 'pointer' }}>
                   <Avatar src={editImagePreview} name={editName} size={80} />
                   <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>Change Image</div>
                 </label>
                 <input type="file" id="groupImageEdit" hidden accept="image/*" onChange={handleImageChange} />
                 
                 <input 
                   type="text" 
                   value={editName} 
                   onChange={(e) => setEditName(e.target.value)} 
                   className={styles.editInput} 
                   placeholder="Group Name"
                 />
                 <textarea 
                   value={editDesc} 
                   onChange={(e) => setEditDesc(e.target.value)} 
                   className={styles.editTextarea} 
                   placeholder="Group Description"
                 />
                 <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                   <button className={styles.saveBtn} onClick={handleSaveEdit} disabled={loading}>Save</button>
                   <button className={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={loading}>Cancel</button>
                 </div>
              </div>
            ) : (
              <>
                <Avatar src={groupData.groupImage} name={groupData.name} size={80} />
                <h3>{groupData.name}</h3>
                {groupData.description && (
                  <p className={styles.groupDesc}>{groupData.description}</p>
                )}
                {isAdmin && (
                  <button className={styles.editBtnText} onClick={() => setIsEditing(true)}>Edit Group</button>
                )}
                <span className={styles.sectionTitle}>
                  {groupData.members?.length || 0} Members
                </span>
              </>
            )}
          </div>

          {isAdmin && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Add Member</div>
              <div className={styles.addMemberArea}>
                <input
                  type="text"
                  placeholder="Search users to add..."
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map((u) => {
                      // Don't show users already in the group
                      const isAlreadyMember = groupData.members?.some(
                        (m) => (m._id || m) === u._id
                      );
                      if (isAlreadyMember) return null;

                      return (
                        <div key={u._id} className={styles.searchItem}>
                          <div className={styles.memberInfo}>
                            <Avatar src={u.avatar} name={u.name} size={30} />
                            <span className={styles.memberName}>{u.name}</span>
                          </div>
                          <button
                            className={styles.addBtn}
                            onClick={() => handleAdd(u._id)}
                            disabled={loading}
                          >
                            <IoPersonAdd size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Members</div>
            <div className={styles.memberList}>
              {groupData.members?.map((m) => {
                // If member object isn't fully populated in some states, fallback to basic display
                const memberId = m._id || m;
                const memberName = m.name || "Unknown User";
                const isMemberAdmin = (groupData.admin?._id || groupData.admin) === memberId;

                return (
                  <div key={memberId} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <Avatar src={m.avatar} name={memberName} size={36} />
                      <span className={styles.memberName}>
                        {memberName}
                        {isMemberAdmin && <span className={styles.adminBadge}>Admin</span>}
                        {memberId === user?._id && <span className={styles.adminBadge} style={{ background: 'var(--text-muted)' }}>You</span>}
                      </span>
                    </div>
                    {isAdmin && !isMemberAdmin && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemove(memberId)}
                        title="Remove Member"
                        disabled={loading}
                      >
                        <IoTrash size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <div className={styles.dangerZone}>
              <button
                className={styles.deleteGroupBtn}
                onClick={handleDeleteGroup}
                disabled={loading}
              >
                <IoTrash size={18} />
                Delete Group
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
