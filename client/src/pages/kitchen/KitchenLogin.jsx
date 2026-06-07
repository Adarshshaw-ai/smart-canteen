import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function KitchenLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user && user.role === "kitchen") {
    navigate("/kitchen/dashboard");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username, password);
      if (u.role !== "kitchen") {
        toast.error("Access denied: Kitchen staff only");
        return;
      }
      toast.success("Welcome, Kitchen Staff!");
      navigate("/kitchen/dashboard");
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
          <span className="icon">👨‍🍳</span> Kitchen Portal
        </div>
        <div className="navbar-links">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>
      </div>
      <div className="login-wrapper">
        <form className="login-box" onSubmit={handleSubmit}>
          <div className="login-logo">👨‍🍳</div>
          <h1>Kitchen Portal</h1>
          <p className="subtitle">Sign in to manage orders</p>
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
