import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

const FOOD_ICONS = {
  "South Indian": "🥘",
  "North Indian": "🍛",
  Rice: "🍚",
  Snacks: "🍟",
  Beverages: "☕",
  Breads: "🫓",
  Desserts: "🍮",
};

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("table") || "";
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [orderModal, setOrderModal] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNum, setTableNum] = useState(tableNumber);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState(["cash"]);
  const [selectedMethod, setSelectedMethod] = useState("cash");

  useEffect(() => {
    fetch("/api/menu/available")
      .then((r) => r.json())
      .then((d) => {
        setMenu(d);
        const cats = [...new Set(d.map((i) => i.category))];
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load menu");
        setLoading(false);
      });

    fetch("/api/payments/methods")
      .then((r) => r.json())
      .then((d) => setPaymentMethods(["cash", ...d]));
  }, []);

  const filtered = menu.filter(
    (i) =>
      (activeCategory === "All" || i.category === activeCategory) &&
      (i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())),
  );

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id);
      if (exists)
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added!`);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: tableNum ? parseInt(tableNum) : null,
          customer_name: customerName || "Guest",
          customer_phone: customerPhone,
          items: cart.map((c) => ({ id: c.id, quantity: c.quantity })),
          payment_method: selectedMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (selectedMethod === "Razorpay") {
        await handleRazorpayPayment(data);
      } else {
        setOrderResult(data);
        setCart([]);
        setCartOpen(false);
        setOrderModal(false);
        toast.success("Order placed!");
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRazorpayPayment = async (order) => {
    if (!window.Razorpay) {
      return toast.error("Payment gateway is loading, please try again in a moment");
    }
    try {
      const res = await fetch("/api/payments/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: order.total_amount, order_id: order.id }),
      });
      const rzpOrder = await res.json();

      const options = {
        key: rzpOrder.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Smart Canteen",
        description: `Order #${order.token_number}`,
        order_id: rzpOrder.id,
        handler: async (response) => {
          const verifyRes = await fetch("/api/payments/verify-razorpay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              internal_order_id: order.id,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.status === "ok") {
            setOrderResult(order);
            setCart([]);
            setCartOpen(false);
            setOrderModal(false);
            toast.success("Payment Successful! Order placed.");
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: customerName,
          contact: customerPhone,
        },
        theme: { color: "#FF6B35" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error("Failed to initiate payment");
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div className="spinner" />
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="navbar">
        <div className="navbar-brand">
          <a href="/home">
            <span className="icon">🍽️</span> Smart Canteen
          </a>
        </div>
        {tableNumber && (
          <span style={{ fontSize: ".85rem", color: "var(--accent)" }}>
            📍 Table {tableNumber}
          </span>
        )}
      </div>

      <div className="page">
        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            className="input"
            placeholder="🔍 Search for dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 500, background: "var(--bg-card)" }}
          />
        </div>

        {/* Categories */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 28,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          <button
            className={`btn btn-sm ${activeCategory === "All" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveCategory("All")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${activeCategory === c ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveCategory(c)}
            >
              {FOOD_ICONS[c] || "🍽️"} {c}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🍽️</div>
            <p>No items found</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="menu-card fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="menu-card-img">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <>{FOOD_ICONS[item.category] || "🍽️"}</>
                  )}
                </div>
                <div className="menu-card-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div className="menu-card-title">{item.name}</div>
                    <span className="menu-card-badge">⏱ {item.prep_time}m</span>
                  </div>
                  <div className="menu-card-desc">{item.description}</div>
                  <div className="menu-card-footer">
                    <span className="menu-card-price">₹{item.price}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => addToCart(item)}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          🛒 <span className="cart-count">{cartCount}</span>
        </button>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)} />
      )}
      <div className={`cart-sidebar ${cartOpen ? "open" : ""}`}>
        <div className="cart-header">
          <h3>🛒 Your Cart ({cartCount})</h3>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setCartOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">
                  ₹{item.price} × {item.quantity} = ₹
                  {item.price * item.quantity}
                </div>
              </div>
              <div className="cart-qty">
                <button onClick={() => updateQty(item.id, -1)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-footer">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>₹{cartTotal}</span>
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setCartOpen(false);
              setOrderModal(true);
            }}
          >
            Proceed to Order
          </button>
        </div>
      </div>

      {/* Order Modal */}
      {orderModal && (
        <div className="modal-overlay" onClick={() => setOrderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📝 Confirm Order</h2>
            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                className="input"
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Table Number</label>
              <input
                className="input"
                type="number"
                placeholder="Table number"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Payment Method</label>
              <div style={{ display: "flex", gap: 10 }}>
                {paymentMethods.map(m => (
                  <button
                    key={m}
                    className={`btn btn-sm ${selectedMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setSelectedMethod(m)}
                  >
                    {m === 'cash' ? '💵 Cash' : m === 'Razorpay' ? '💳 Online' : m}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius)",
                padding: 16,
                marginBottom: 20,
              }}
            >
              {cart.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    fontSize: ".9rem",
                  }}
                >
                  <span>
                    {c.name} × {c.quantity}
                  </span>
                  <span>₹{c.price * c.quantity}</span>
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: 10,
                  paddingTop: 10,
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--accent)" }}>₹{cartTotal}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setOrderModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={placeOrder}
              >
                Place Order 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderResult && (
        <div className="modal-overlay" onClick={() => setOrderResult(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "center" }}
          >
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "var(--success)" }}>Order Placed!</h2>
            <p
              style={{ color: "var(--text-secondary)", margin: "10px 0 20px" }}
            >
              Your order has been sent to the kitchen
            </p>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius)",
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: ".85rem",
                  color: "var(--text-muted)",
                  marginBottom: 4,
                }}
              >
                Token Number
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                }}
              >
                {orderResult.token_number}
              </div>
            </div>
            <p style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
              Total: ₹{orderResult.total_amount}
            </p>
            <button
              className="btn btn-primary btn-lg"
              style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
              onClick={() => setOrderResult(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
