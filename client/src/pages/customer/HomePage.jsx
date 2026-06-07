import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewMenu = () => {
    navigate("/menu");
  };

  const handleAdminLogin = () => {
    navigate("/admin/login");
  };

  const handleKitchenLogin = () => {
    navigate("/kitchen");
  };

  const handleCounterLogin = () => {
    navigate("/counter/login");
  };

  if (user) {
    handleViewMenu();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-card) 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div className="navbar" style={{ flexShrink: 0 }}>
        <div className="navbar-brand">
          <span className="icon">🍽️</span>
          <span style={{ display: isMobile ? "none" : "inline" }}>
            {" "}
            Smart Canteen
          </span>
        </div>
        <div className="navbar-links">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleViewMenu}
            style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}
          >
            📱 {isMobile ? "Menu" : "Browse Menu"}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="page"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingTop: isMobile ? 24 : 60,
          paddingBottom: isMobile ? 24 : 32,
          flex: 1,
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? "95%" : 600,
            marginBottom: isMobile ? 32 : 60,
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? "1.8rem" : "3.5rem",
              marginBottom: 16,
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            🍕 Welcome to Smart Canteen
          </h1>
          <p
            style={{
              fontSize: isMobile ? "0.95rem" : "1.2rem",
              color: "var(--text-muted)",
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            Fast, convenient ordering with QR codes. Browse our menu, place your
            order, and enjoy freshly prepared food!
          </p>

          {/* Features */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : window.innerWidth < 1024
                  ? "1fr 1fr"
                  : "1fr 1fr 1fr",
              gap: isMobile ? 16 : 24,
              marginBottom: isMobile ? 32 : 48,
            }}
          >
            <div
              style={{
                padding: isMobile ? 16 : 24,
                background: "var(--bg-card)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "2rem" : "2.5rem",
                  marginBottom: 12,
                }}
              >
                📱
              </div>
              <h3
                style={{
                  fontSize: isMobile ? "1rem" : "1.1rem",
                  marginBottom: 8,
                }}
              >
                Easy Ordering
              </h3>
              <p
                style={{
                  fontSize: isMobile ? "0.85rem" : ".95rem",
                  color: "var(--text-muted)",
                }}
              >
                Scan QR & order instantly
              </p>
            </div>
            <div
              style={{
                padding: isMobile ? 16 : 24,
                background: "var(--bg-card)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "2rem" : "2.5rem",
                  marginBottom: 12,
                }}
              >
                ⚡
              </div>
              <h3
                style={{
                  fontSize: isMobile ? "1rem" : "1.1rem",
                  marginBottom: 8,
                }}
              >
                Fast Preparation
              </h3>
              <p
                style={{
                  fontSize: isMobile ? "0.85rem" : ".95rem",
                  color: "var(--text-muted)",
                }}
              >
                Real-time order tracking
              </p>
            </div>
            <div
              style={{
                padding: isMobile ? 16 : 24,
                background: "var(--bg-card)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "2rem" : "2.5rem",
                  marginBottom: 12,
                }}
              >
                🔐
              </div>
              <h3
                style={{
                  fontSize: isMobile ? "1rem" : "1.1rem",
                  marginBottom: 8,
                }}
              >
                Secure
              </h3>
              <p
                style={{
                  fontSize: isMobile ? "0.85rem" : ".95rem",
                  color: "var(--text-muted)",
                }}
              >
                Safe & reliable payments
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: isMobile ? 32 : 40,
            }}
          >
            <h2
              style={{
                marginBottom: 16,
                fontSize: isMobile ? "1.2rem" : "1.5rem",
                color: "var(--text-primary)",
              }}
            >
              Get Started
            </h2>
            <button
              className="btn btn-primary"
              onClick={handleViewMenu}
              style={{
                padding: isMobile ? "12px 20px" : "14px 32px",
                fontSize: isMobile ? "1rem" : "1.1rem",
                minHeight: isMobile ? 44 : 50,
              }}
            >
              👥 Browse Menu as Customer
            </button>
          </div>

          {/* Staff Login */}
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              paddingTop: isMobile ? 24 : 40,
            }}
          >
            <h3
              style={{
                marginBottom: 24,
                color: "var(--text-primary)",
                fontSize: isMobile ? "1.1rem" : "1.3rem",
              }}
            >
              Staff Login
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                gap: isMobile ? 12 : 16,
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={handleAdminLogin}
                style={{
                  padding: isMobile ? "12px 16px" : "12px 24px",
                  minHeight: isMobile ? 44 : 45,
                }}
              >
                🛡️ Admin
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleKitchenLogin}
                style={{
                  padding: isMobile ? "12px 16px" : "12px 24px",
                  minHeight: isMobile ? 44 : 45,
                }}
              >
                👨‍🍳 Kitchen
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCounterLogin}
                style={{
                  padding: isMobile ? "12px 16px" : "12px 24px",
                  minHeight: isMobile ? 44 : 45,
                }}
              >
                💳 Counter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: isMobile ? "16px" : "32px 16px",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-color)",
          marginTop: isMobile ? 24 : 60,
          fontSize: isMobile ? "0.85rem" : "1rem",
          flexShrink: 0,
        }}
      >
        <p>© 2024 Smart Canteen. All rights reserved.</p>
      </footer>
    </div>
  );
}
