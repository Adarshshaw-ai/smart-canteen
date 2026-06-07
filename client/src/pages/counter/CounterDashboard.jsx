import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export default function CounterDashboard() {
  const { user, logout, authFetch } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders?status=ready');
      setOrders(await res.json());
    } catch {} finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (order) => {
      if (order.status === 'ready') {
        setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
        toast('🔔 Order ready for pickup!', { icon:'✅' });
      } else {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      }
    };
    socket.on('order-updated', handleUpdate);
    return () => socket.off('order-updated', handleUpdate);
  }, [socket]);

  const markCompleted = async (id) => {
    try {
      await authFetch(`/api/orders/${id}/status`, { method:'PATCH', body:JSON.stringify({ status:'completed' }) });
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Order completed!');
    } catch { toast.error('Failed'); }
  };

  const markPaid = async (id) => {
    try {
      await authFetch(`/api/orders/${id}/payment`, { method:'PATCH', body:JSON.stringify({ payment_status:'paid' }) });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status:'paid' } : o));
      toast.success('Payment recorded');
    } catch { toast.error('Failed'); }
  };

  const handleLogout = () => { logout(); navigate('/counter/login'); };

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🧾</span> Counter Dashboard</div>
        <div className="navbar-links">
          <Link to="/counter" className="nav-link active">Ready Orders</Link>
          <Link to="/counter/verify" className="nav-link">Verify Order</Link>
          <span style={{ fontSize:'.85rem', color:'var(--text-secondary)' }}>Hi, {user?.name}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <h1>Ready for Pickup</h1>
          <p>{orders.length} orders ready</p>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', marginBottom:28 }}>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div><div className="stat-value">{orders.length}</div><div className="stat-label">Ready Orders</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gold">💰</div>
            <div><div className="stat-value">{orders.filter(o=>o.payment_status==='pending').length}</div><div className="stat-label">Pending Payment</div></div>
          </div>
        </div>

        {loading ? <div className="spinner" /> : orders.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><p>No orders ready for pickup</p></div>
        ) : (
          <div className="grid grid-3">
            {orders.map((order, i) => (
              <div key={order.id} className="order-card" style={{ animationDelay:`${i*80}ms` }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-token">{order.token_number}</div>
                    <div className="order-table">{order.table_number ? `Table ${order.table_number}` : 'Takeaway'} • {order.customer_name}</div>
                  </div>
                  <span className="badge badge-ready">Ready</span>
                </div>
                <div className="order-items-list">
                  {order.items?.map((item, j) => (
                    <div key={j} className="order-item-row">
                      <span>{item.item_name} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-total"><span>Total</span><span>₹{order.total_amount}</span></div>
                <div style={{ marginTop:10 }}>
                  <span className={`badge ${order.payment_status==='paid'?'badge-ready':'badge-pending'}`}>
                    💳 {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                <div className="order-actions">
                  {order.payment_status !== 'paid' && (
                    <button className="btn btn-warning btn-sm" onClick={() => markPaid(order.id)}>💰 Mark Paid</button>
                  )}
                  <button className="btn btn-success btn-sm" onClick={() => markCompleted(order.id)}>✅ Complete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
