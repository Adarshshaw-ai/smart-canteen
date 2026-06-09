import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function MenuManagement() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    prep_time: "10",
    stock_quantity: "100",
    station: "Main Kitchen",
    image_url: "",
  });
  const [imagePreview, setImagePreview] = useState(null);

  const fetchItems = async () => {
    try {
      const res = await authFetch("/api/menu");
      setItems(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      prep_time: "10",
      stock_quantity: "100",
      station: "Main Kitchen",
      image_url: "",
    });
    setImagePreview(null);
    setModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      prep_time: String(item.prep_time),
      stock_quantity: String(item.stock_quantity),
      station: item.station || "Main Kitchen",
      image_url: item.image_url || "",
    });
    setImagePreview(item.image_url || null);
    setModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Please upload an image file");
    if (file.size > 2 * 1024 * 1024)
      return toast.error("Image size must be less than 2MB");

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setForm({ ...form, image_url: base64 });
      setImagePreview(base64);
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category)
      return toast.error("Fill required fields");
    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        prep_time: parseInt(form.prep_time),
        stock_quantity: parseInt(form.stock_quantity),
        available: editing ? editing.available : true,
      };
      const url = editing ? `/api/menu/${editing.id}` : "/api/menu";
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      toast.success(editing ? "Item updated!" : "Item added!");
      setModal(false);
      fetchItems();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await authFetch(`/api/menu/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted");
      fetchItems();
    } catch {
      toast.error("Failed");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await authFetch(`/api/menu/${id}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to toggle");
      fetchItems();
    } catch {
      toast.error("Failed");
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
          <Link to="/admin/menu" className="nav-link active">
            Menu
          </Link>
          <Link to="/admin/qr" className="nav-link">
            QR Codes
          </Link>
          <Link to="/admin/orders" className="nav-link">
            Orders
          </Link>
          <Link to="/admin/reports" className="nav-link">
            Reports
          </Link>
          <Link to="/admin/staff" className="nav-link">
            Staff
          </Link>
          <Link to="/admin/payments" className="nav-link">
            Payments
          </Link>
          <Link to="/admin/profile" className="nav-link">
            Profile
          </Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <div className="page">
        <div
          className="page-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1>Menu Management</h1>
            <p>{items.length} items</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Item
          </button>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Prep Time</th>
                  <th>Stock</th>
                  <th>Station</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <br />
                      <span
                        style={{
                          fontSize: ".8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {item.description}
                      </span>
                    </td>
                    <td>{item.category}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                      ₹{item.price}
                    </td>
                    <td>{item.prep_time}m</td>
                    <td style={{ fontWeight: 600, color: item.stock_quantity < 10 ? 'var(--danger)' : 'inherit' }}>
                      {item.stock_quantity}
                    </td>
                    <td style={{ fontSize: '.85rem' }}>{item.station}</td>
                    <td>
                      <span
                        className={`badge ${item.available ? "badge-ready" : "badge-cancelled"}`}
                      >
                        {item.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEdit(item)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggle(item.id)}
                        >
                          {item.available ? "🚫" : "✅"}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Edit Item" : "Add New Item"}</h2>
            <div className="input-group">
              <label>Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea
                className="input"
                rows="2"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="input-group">
                <label>Price (₹) *</label>
                <input
                  className="input"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Prep Time (min)</label>
                <input
                  className="input"
                  type="number"
                  value={form.prep_time}
                  onChange={(e) =>
                    setForm({ ...form, prep_time: e.target.value })
                  }
                />
              </div>
              <div className="input-group">
                <label>Stock Quantity</label>
                <input
                  className="input"
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="input-group">
              <label>Category *</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. South Indian, Snacks"
              />
            </div>
            <div className="input-group">
              <label>Kitchen Station *</label>
              <input
                className="input"
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
                placeholder="e.g. Grill, Beverages, Fryer"
              />
            </div>
            <div className="input-group">
              <label>Upload Picture (Optional)</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input"
                  style={{ padding: 8 }}
                />
                {imagePreview && (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 150,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "2px solid var(--border-color)",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, image_url: "" });
                        setImagePreview(null);
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(255,0,0,0.7)",
                        color: "white",
                        border: "none",
                        borderRadius: 50,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
