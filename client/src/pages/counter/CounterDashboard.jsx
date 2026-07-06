import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const timeSince = (date) => {
  const mins = Math.floor((Date.now() - new Date(date + 'Z').getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ${mins%60}m ago`;
};

export default function CounterDashboard() {
  const { user, logout, authFetch } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ready');

  const fetchOrders = useCallback(async () => {
    try {
      const [resPending, resCooking, resReady] = await Promise.all([
        authFetch('/api/orders?status=pending'),
        authFetch('/api/orders?status=cooking'),
        authFetch('/api/orders?status=ready'),
      ]);
      const pending = await resPending.json();
      const cooking = await resCooking.json();
      const ready = await resReady.json();
      setOrders([...pending, ...cooking, ...ready]);
    } catch {} finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (order) => {
      setOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      toast('🔔 New order placed!', { icon: '📦' });
    };
    const handleUpdate = (order) => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => {
          const existing = prev.find(o => o.id === order.id);
          if (order.status === 'ready' && (!existing || existing.status !== 'ready')) {
            toast('🔔 Order ready for pickup!', { icon:'✅' });
          }
          if (existing) {
            return prev.map(o => o.id === order.id ? order : o);
          } else {
            return [order, ...prev];
          }
        });
      }
    };
    socket.on('new-order', handleNew);
    socket.on('order-updated', handleUpdate);
    return () => {
      socket.off('new-order', handleNew);
      socket.off('order-updated', handleUpdate);
    };
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

  const displayedOrders = orders.filter(o => {
    if (activeTab === 'ready') return o.status === 'ready';
    if (activeTab === 'preparing') return o.status === 'pending' || o.status === 'cooking';
    return true;
  });

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🧾</span> Counter Dashboard</div>
        <div className="navbar-links">
          <Link to="/counter" className="nav-link active">Active Orders</Link>
          <Link to="/counter/verify" className="nav-link">Verify Order</Link>
          <span style={{ fontSize:'.85rem', color:'var(--text-secondary)' }}>Hi, {user?.name}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <h1>Active Orders</h1>
          <p>Manage order payments and handovers</p>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', marginBottom:28 }}>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <div className="stat-value">{orders.filter(o => o.status === 'ready').length}</div>
              <div className="stat-label">Ready Orders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gold">💰</div>
            <div>
              <div className="stat-value">{orders.filter(o=>o.payment_status==='pending').length}</div>
              <div className="stat-label">Pending Payment</div>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ maxWidth: 500, marginBottom: 24 }}>
          <div className={`tab ${activeTab === 'ready' ? 'active' : ''}`} onClick={() => setActiveTab('ready')}>
            ✅ Ready ({orders.filter(o => o.status === 'ready').length})
          </div>
          <div className={`tab ${activeTab === 'preparing' ? 'active' : ''}`} onClick={() => setActiveTab('preparing')}>
            ⏳ Preparing ({orders.filter(o => o.status === 'pending' || o.status === 'cooking').length})
          </div>
          <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            📋 All Active ({orders.length})
          </div>
        </div>

        {loading ? <div className="spinner" /> : displayedOrders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">
              {activeTab === 'ready' ? '✅' : activeTab === 'preparing' ? '⏳' : '📋'}
            </div>
            <p>No {activeTab === 'all' ? 'active' : activeTab} orders</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {displayedOrders.map((order, i) => (
              <div key={order.id} className="order-card" style={{ animationDelay:`${i*80}ms` }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-token">{order.token_number}</div>
                    <div className="order-table">{order.table_number ? `Table ${order.table_number}` : 'Takeaway'} • {order.customer_name}</div>
                  </div>
                  <span className={`badge badge-${order.status}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span className={`badge ${order.payment_status==='paid'?'badge-ready':'badge-pending'}`}>
                    💳 {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                    ⏰ {timeSince(order.created_at)}
                  </span>
                </div>
                <div className="order-actions">
                  {order.payment_status !== 'paid' && (
                    <button className="btn btn-warning btn-sm" onClick={() => markPaid(order.id)}>💰 Mark Paid</button>
                  )}
                  {order.status === 'ready' && (
                    <button className="btn btn-success btn-sm" onClick={() => markCompleted(order.id)}>✅ Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
