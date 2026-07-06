import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";

const FOOD_ICONS = {
  "South Indian": "🥘",
  "North Indian": "🍛",
  Rice: "🍚",
  Snacks: "🍟",
  Beverages: "☕",
  Breads: "🫓",
  Desserts: "🍮",
};

// Helper function to detect vegetarian items
const isVegItem = (item) => {
  const nonVegKeywords = ["chicken", "mutton", "egg", "fish", "meat", "non-veg", "wings", "pork", "beef"];
  const nameLower = item.name.toLowerCase();
  const descLower = (item.description || "").toLowerCase();
  
  const hasNonVegKeyword = nonVegKeywords.some(keyword => 
    nameLower.includes(keyword) || descLower.includes(keyword)
  );
  
  return !hasNonVegKeyword;
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
  const [pendingOrder, setPendingOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNum, setTableNum] = useState(tableNumber);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState(["cash"]);
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on("order-cancelled", (order) => {
      if (pendingOrder && pendingOrder.id === order.id) {
        setPendingOrder(null);
        toast.error("Order expired due to non-payment", { duration: 6000 });
      }
    });
    return () => socket.off("order-cancelled");
  }, [socket, pendingOrder]);

  useEffect(() => {
    let timer;
    if (pendingOrder && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && pendingOrder) {
      setPendingOrder(null);
    }
    return () => clearInterval(timer);
  }, [pendingOrder, timeLeft]);

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
        setPendingOrder(data);
        setTimeLeft(300); // 5 minutes
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
            setPendingOrder(null);
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
          <div className="table-badge-floating">
            📍 Table {tableNumber}
          </div>
        )}
      </div>

      <div className="page">
        {/* Hero Section */}
        <div className="menu-hero">
          <h1>Feast Your Senses 🍽️</h1>
          <p>Fresh, hot, and delicious food delivered straight to your table.</p>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search for delicious dishes, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Carousel */}
        <div className="categories-container">
          <button
            className={`category-card ${activeCategory === "All" ? "active" : ""}`}
            onClick={() => setActiveCategory("All")}
          >
            <span className="category-emoji">✨</span>
            <span>All Items</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`category-card ${activeCategory === c ? "active" : ""}`}
              onClick={() => setActiveCategory(c)}
            >
              <span className="category-emoji">{FOOD_ICONS[c] || "🍽️"}</span>
              <span>{c}</span>
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon" style={{ fontSize: "5rem" }}>🔍</div>
            <h3>No delicious dishes found</h3>
            <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
              Try searching with different terms or check another category
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {filtered.map((item, i) => {
              const isVeg = isVegItem(item);
              // Calculate a simple hash-based rating for visual flare
              const rating = (4.0 + ((item.id * 7) % 10) / 10).toFixed(1);
              const reviewsCount = 45 + (item.id * 13) % 200;
              
              return (
                <div
                  key={item.id}
                  className="menu-card fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Veg/Non-Veg indicator badge */}
                  <div className="food-type-tag">
                    <div className={`food-type-indicator ${isVeg ? "veg" : "non-veg"}`} title={isVeg ? "Veg" : "Non-Veg"} />
                  </div>

                  {/* Top-right badges */}
                  <div className="menu-card-badges">
                    <span className="menu-badge">⏱️ {item.prep_time}m</span>
                    {parseFloat(rating) >= 4.5 && (
                      <span className="menu-badge popular">🔥 Top Rated</span>
                    )}
                  </div>

                  <div className="menu-card-img-wrapper">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="menu-placeholder-img">
                        {FOOD_ICONS[item.category] || "🍽️"}
                      </div>
                    )}
                  </div>

                  <div className="menu-card-body">
                    <div className="menu-card-title">{item.name}</div>
                    
                    {/* Rating sub-row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--gold)" }}>★</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{rating}</span>
                      <span>({reviewsCount} reviews)</span>
                    </div>

                    <div className="menu-card-desc">{item.description}</div>
                    
                    <div className="menu-card-footer">
                      <span className="menu-card-price">{item.price}</span>
                      {(() => {
                        const cartItem = cart.find((c) => c.id === item.id);
                        if (cartItem) {
                          return (
                            <div className="card-qty-control">
                              <button
                                className="card-qty-btn"
                                onClick={() => updateQty(item.id, -1)}
                              >
                                −
                              </button>
                              <span className="card-qty-val">
                                {cartItem.quantity}
                              </span>
                              <button
                                className="card-qty-btn"
                                onClick={() => updateQty(item.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button
                            className="btn btn-primary btn-add btn-sm"
                            onClick={() => addToCart(item)}
                          >
                            <span>+ Add</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12, textAlign: "center" }}>
              📝 Order Summary
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", marginBottom: 24 }}>
              Verify details and choose payment method to complete order
            </p>

            <div className="input-group">
              <label>Your Name</label>
              <input
                className="input"
                placeholder="Enter your name (e.g. Adarsh)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ background: "rgba(10, 10, 20, 0.4)" }}
              />
            </div>
            
            <div className="input-group">
              <label>Phone Number</label>
              <input
                className="input"
                type="tel"
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ background: "rgba(10, 10, 20, 0.4)" }}
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
                style={{ background: "rgba(10, 10, 20, 0.4)" }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 24 }}>
              <label>Payment Method</label>
              <div style={{ display: "flex", gap: 10 }}>
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${selectedMethod === m ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, textTransform: "capitalize", justifyContent: "center", padding: "10px" }}
                    onClick={() => setSelectedMethod(m)}
                  >
                    {m === "cash" ? "💵 Cash" : m === "Razorpay" ? "💳 Online" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt container */}
            <div className="receipt-card">
              <div className="receipt-header">
                <span className="receipt-header-title">SMART CANTEEN</span>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Table #{tableNum || "N/A"} • Order Details
                </div>
              </div>

              {cart.map((c) => (
                <div key={c.id} className="receipt-item">
                  <span style={{ color: "var(--text-secondary)" }}>
                    {c.name} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>x{c.quantity}</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{c.price * c.quantity}</span>
                </div>
              ))}

              <div className="receipt-total">
                <span>Total Amount</span>
                <span style={{ color: "var(--accent)" }}>₹{cartTotal}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: "center", padding: "12px" }}
                onClick={() => setOrderModal(false)}
              >
                Go Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center", padding: "12px", boxShadow: "0 4px 16px var(--accent-glow)" }}
                onClick={placeOrder}
              >
                Confirm & Pay 🚀
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
            style={{ textAlign: "center", maxWidth: 400, padding: "40px 24px" }}
          >
            <div style={{ fontSize: "4.5rem", marginBottom: 12, display: "inline-block", animation: "pulse 2s infinite" }}>🎉</div>
            <h2 style={{ color: "var(--success)", fontSize: "1.6rem", fontWeight: 800 }}>Order Confirmed!</h2>
            <p style={{ color: "var(--text-secondary)", margin: "8px 0 24px", fontSize: "0.9rem" }}>
              Your meal is being prepared with love in the kitchen.
            </p>
            
            <div
              style={{
                background: "radial-gradient(circle at top left, var(--bg-card-hover), var(--bg-secondary))",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 24,
                marginBottom: 20,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Your Token Number
              </div>
              <div
                style={{
                  fontSize: "2.8rem",
                  fontWeight: 900,
                  color: "var(--accent)",
                  lineHeight: 1,
                  textShadow: "0 0 10px var(--accent-glow)"
                }}
              >
                {orderResult.token_number}
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 28 }}>
              <span>Total Paid:</span>
              <strong style={{ color: "var(--text-primary)" }}>₹{orderResult.total_amount}</strong>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center", boxShadow: "0 4px 16px var(--accent-glow)" }}
              onClick={() => setOrderResult(null)}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Pending Payment Modal */}
      {pendingOrder && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }} />
            <h2>⏳ Waiting for Payment</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
              Please complete the payment in the Razorpay window
            </p>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius)",
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
                Expires in
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: timeLeft < 60 ? "var(--danger)" : "var(--accent)",
                }}
              >
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, "0")}
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => handleRazorpayPayment(pendingOrder)}
            >
              Retry Payment 💳
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              onClick={() => setPendingOrder(null)}
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

