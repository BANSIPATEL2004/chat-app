import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { IoChatbubbles } from "react-icons/io5";
import useAuthStore from "../store/authStore";
import styles from "./Auth.module.css";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      await login(form);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <IoChatbubbles size={36} color="#6c63ff" />
          <h1>ChatApp</h1>
        </div>
        <p className={styles.subtitle}>Sign in to your account</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className={styles.link}>
          New here? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
}
