import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import useAuthStore from "../store/authStore";
import API from "../services/api";
import Avatar from "../components/Avatar";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image")) return toast.error("Select an image");
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("bio", bio);
    if (avatarFile) fd.append("avatar", avatarFile);

    try {
      const res = await API.put("/users/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data);
      toast.success("Profile updated!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button onClick={() => navigate("/")} className={styles.back}>
            <IoArrowBack size={20} />
          </button>
          <h2>Edit Profile</h2>
        </div>

        <div className={styles.avatarSection}>
          <div className={styles.avatarWrap}>
            <Avatar
              src={preview || user?.avatar}
              name={user?.name}
              size={100}
            />
            <button
              className={styles.cameraBtn}
              onClick={() => fileRef.current?.click()}
              title="Change photo"
            >
              <IoCamera size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          <p className={styles.changeText}>Tap to change photo</p>
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input value={user?.email} disabled />
          </div>
          <div className={styles.field}>
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell something about yourself..."
              rows={3}
              maxLength={100}
            />
            <span className={styles.charCount}>{bio.length}/100</span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.infoBadge}>
            <span className={styles.dot} />
            {user?.status === "online" ? "Online" : "Offline"}
          </div>
          <div className={styles.infoText}>
            Member since {new Date(user?.createdAt).toLocaleDateString()}
          </div>
        </div>

        <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
