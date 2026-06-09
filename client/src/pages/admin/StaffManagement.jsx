import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function StaffManagement() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "kitchen",
  });

  const fetchUsers = async () => {
    try {
      const res = await authFetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }
      toast.success("Staff member created");
      setModal(false);
      setForm({ username: "", password: "", name: "", role: "kitchen" });
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      const res = await authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Staff removed");
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
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
          <Link to="/admin/staff" className="nav-link active">Staff</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/profile" className="nav-link">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="page fade-in">
        <div className="page-header">
          <div>
            <h1>👥 Staff Management</h1>
            <p>Manage kitchen and counter staff accounts.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            + Add Staff
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-ready" : "badge-pending"}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {u.role !== "admin" && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Add New Staff Member</h2>
            <form onSubmit={handleCreate}>
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
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="counter">Counter Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  Create Account
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
