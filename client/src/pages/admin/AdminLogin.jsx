import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch("/api/auth/setup-status");
        const data = await res.json();
        if (data.needsSetup) {
          navigate("/admin/setup");
        }
      } catch (err) {
        console.error("Setup check failed", err);
      }
    };
    checkSetup();
  }, [navigate]);

  if (user && user.role === "admin") {
    navigate("/admin/menu");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username, password);
      if (u.role !== "admin") {
        toast.error("Access denied: Admin only");
        return;
      }
      toast.success("Welcome, Admin!");
      navigate("/admin/menu");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="navbar">
        <div className="navbar-brand">
          <span className="icon">🛡️</span> Admin Portal
        </div>
        <div className="navbar-links">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate("/menu")}
          >
            ← Back to Menu
          </button>
        </div>
      </div>
      <div className="login-wrapper">
        <form className="login-box" onSubmit={handleSubmit}>
          <div className="login-logo">🛡️</div>
          <h1>Admin Portal</h1>
          <p className="subtitle">Sign in to manage the canteen</p>
          <div className="input-group">
            <label>Username</label>
            <input
              className="input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </>
  );
}
