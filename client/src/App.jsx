import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./context/SocketContext";
import { useAuth } from "./context/AuthContext";
import MenuPage from "./pages/customer/MenuPage";
import KitchenLogin from "./pages/kitchen/KitchenLogin";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import Setup from "./pages/admin/Setup";
import MenuManagement from "./pages/admin/MenuManagement";
import QRGenerator from "./pages/admin/QRGenerator";
import OrderHistory from "./pages/admin/OrderHistory";
import Reports from "./pages/admin/Reports";
import StaffManagement from "./pages/admin/StaffManagement";
import PaymentManagement from "./pages/admin/PaymentManagement";
import AdminProfile from "./pages/admin/AdminProfile";
import CounterLogin from "./pages/counter/CounterLogin";
import CounterDashboard from "./pages/counter/CounterDashboard";
import OrderVerification from "./pages/counter/OrderVerification";

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user)
    return (
      <Navigate
        to={
          role === "admin"
            ? "/admin/login"
            : role === "counter"
              ? "/counter/login"
              : "/kitchen"
        }
      />
    );
  if (user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <SocketProvider>
      <Toaster
        position="top-right"
        toastOptions={{ className: "toast-custom", duration: 3000 }}
      />
      <Routes>
        {/* Customer */}
        <Route path="/" element={<Navigate to="/menu" />} />
        <Route path="/menu" element={<MenuPage />} />

        {/* Kitchen */}
        <Route path="/kitchen" element={<KitchenLogin />} />
        <Route
          path="/kitchen/dashboard"
          element={
            <ProtectedRoute role="kitchen">
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin/setup" element={<Setup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute role="admin">
              <MenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/qr"
          element={
            <ProtectedRoute role="admin">
              <QRGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute role="admin">
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute role="admin">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute role="admin">
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute role="admin">
              <PaymentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute role="admin">
              <AdminProfile />
            </ProtectedRoute>
          }
        />

        {/* Counter */}
        <Route path="/counter/login" element={<CounterLogin />} />
        <Route
          path="/counter"
          element={
            <ProtectedRoute role="counter">
              <CounterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/counter/verify"
          element={
            <ProtectedRoute role="counter">
              <OrderVerification />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </SocketProvider>
  );
}
