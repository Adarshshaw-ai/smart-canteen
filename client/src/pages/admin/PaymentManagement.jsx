import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function PaymentManagement() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    method_name: "Razorpay",
    key_id: "",
    key_secret: "",
    is_active: true,
  });

  const fetchConfigs = async () => {
    try {
      const res = await authFetch("/api/payments/config");
      const data = await res.json();
      setConfigs(data);
    } catch {
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async () => {
    if (!form.key_id || !form.key_secret) return toast.error("Enter all keys");
    try {
      const body = {
        method_name: form.method_name,
        config_data: { key_id: form.key_id, key_secret: form.key_secret },
        is_active: form.is_active,
      };
      const res = await authFetch("/api/payments/config", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Settings saved!");
      fetchConfigs();
      setEditing(null);
    } catch (e) {
      toast.error(e.message);
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
          <Link to="/admin/staff" className="nav-link">Staff</Link>
          <Link to="/admin/payments" className="nav-link active">Payments</Link>
          <Link to="/admin/profile" className="nav-link">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="page fade-in">
        <div className="page-header">
          <h1>💳 Payment Settings</h1>
          <p>Configure online payment gateways for your canteen.</p>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="grid grid-2">
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Razorpay Integration</h3>
                <img src="https://razorpay.com/favicon.png" alt="Razorpay" style={{ width: 24, height: 24 }} />
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: ".9rem", marginBottom: 20 }}>
                Accept UPI, Credit/Debit Cards, and Netbanking via Razorpay.
              </p>
              
              {editing === "Razorpay" ? (
                <div className="form">
                  <div className="input-group">
                    <label>Key ID</label>
                    <input className="input" value={form.key_id} onChange={e => setForm({...form, key_id: e.target.value})} placeholder="rzp_test_..." />
                  </div>
                  <div className="input-group">
                    <label>Key Secret</label>
                    <input className="input" type="password" value={form.key_secret} onChange={e => setForm({...form, key_secret: e.target.value})} placeholder="••••••••••••" />
                  </div>
                  <div className="input-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" id="enable-pay" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} style={{ width: 18, height: 18 }} />
                    <label htmlFor="enable-pay" style={{ marginBottom: 0 }}>Enable Online Payments</label>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave}>Save Settings</button>
                    <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  {configs.find(c => c.method_name === "Razorpay") ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <div style={{ width: 8, height: 8, borderRadius: "50%", background: configs.find(c => c.method_name === "Razorpay")?.is_active ? "var(--success)" : "var(--danger)" }}></div>
                           <span style={{ fontSize: ".85rem", fontWeight: 600, color: configs.find(c => c.method_name === "Razorpay")?.is_active ? "var(--success)" : "var(--danger)" }}>
                             {configs.find(c => c.method_name === "Razorpay")?.is_active ? "ACTIVE" : "INACTIVE"}
                           </span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: ".85rem", color: "var(--text-muted)" }}>
                          Key ID: {configs.find(c => c.method_name === "Razorpay")?.config_data.key_id.slice(0, 10)}...
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        const c = configs.find(c => c.method_name === "Razorpay");
                        setForm({ method_name: "Razorpay", key_id: c.config_data.key_id, key_secret: c.config_data.key_secret, is_active: c.is_active });
                        setEditing("Razorpay");
                      }}>Configure</button>
                    </div>
                  ) : (
                    <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setEditing("Razorpay")}>Set Up Razorpay</button>
                  )}
                </div>
              )}
            </div>
            
            <div className="card" style={{ opacity: 0.6, borderStyle: "dashed" }}>
              <h3 style={{ margin: 0, color: "var(--text-muted)" }}>Other Methods</h3>
              <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: 12 }}>
                Integration for Stripe, PayPal, and PhonePe is currently in development.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
