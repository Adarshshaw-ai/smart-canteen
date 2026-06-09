import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function AdminProfile() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || "",
    name: user?.name || "",
    password: "",
    confirmPassword: "",
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      const body = {
        name: form.name,
        username: form.username,
      };
      if (form.password) body.password = form.password;

      const res = await authFetch("/api/admin/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }

      toast.success("Profile updated! Please login again with new credentials.");
      logout();
      navigate("/admin/login");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="navbar">
        <div className="navbar-brand">
          <span className="icon">🛡️</span> Admin Panel
        </div>
        <div className="navbar-links">
          <Link to="/admin/menu" className="nav-link">Menu</Link>
          <Link to="/admin/qr" className="nav-link">QR Codes</Link>
          <Link to="/admin/orders" className="nav-link">Orders</Link>
          <Link to="/admin/reports" className="nav-link">Reports</Link>
          <Link to="/admin/staff" className="nav-link">Staff</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/profile" className="nav-link active">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={() => { logout(); navigate("/admin/login"); }}>
            Logout
          </button>
        </div>
      </div>

      <div className="page" style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Admin Profile</h1>
          <p>Update your credentials and account details</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <hr style={{ margin: "24px 0", border: "0", borderTop: "1px solid var(--border-color)" }} />
            <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: ".9rem" }}>
              Leave password blank if you don't want to change it.
            </p>
            <div className="input-group">
              <label>New Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <input
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: 12, justifyContent: "center" }}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
