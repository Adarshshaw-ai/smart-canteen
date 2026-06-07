import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export default function KitchenDashboard() {
  const { user, logout, authFetch } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch('/api/orders?status=pending');
      const pending = await res.json();
      const res2 = await authFetch('/api/orders?status=cooking');
      const cooking = await res2.json();
      setOrders([...pending, ...cooking]);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (order) => {
      setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
      toast('🔔 New order received!', { icon: '📦' });
    };
    const handleUpdate = (order) => {
      if (order.status === 'ready' || order.status === 'completed' || order.status === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      }
    };
    socket.on('new-order', handleNew);
    socket.on('order-updated', handleUpdate);
    return () => { socket.off('new-order', handleNew); socket.off('order-updated', handleUpdate); };
  }, [socket]);

  const updateStatus = async (id, status) => {
    try {
      const res = await authFetch(`/api/orders/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      const updated = await res.json();
      if (status === 'ready') {
        setOrders(prev => prev.filter(o => o.id !== id));
        toast.success(`Order marked as ready!`);
      } else {
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
        toast.success(`Order is now ${status}`);
      }
    } catch { toast.error('Failed to update'); }
  };

  const handleLogout = () => { logout(); navigate('/kitchen'); };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const displayed = activeTab === 'pending' ? pendingOrders : cookingOrders;

  const timeSince = (date) => {
    const mins = Math.floor((Date.now() - new Date(date + 'Z').getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ${mins%60}m ago`;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">👨‍🍳</span> Kitchen Dashboard</div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:'.85rem', color:'var(--text-secondary)' }}>Hi, {user?.name}</span>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', marginBottom:28 }}>
          <div className="stat-card">
            <div className="stat-icon gold">📋</div>
            <div><div className="stat-value">{pendingOrders.length}</div><div className="stat-label">Pending</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🔥</div>
            <div><div className="stat-value">{cookingOrders.length}</div><div className="stat-label">Cooking</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📦</div>
            <div><div className="stat-value">{orders.length}</div><div className="stat-label">Total Active</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ maxWidth:400 }}>
          <div className={`tab ${activeTab==='pending'?'active':''}`} onClick={() => setActiveTab('pending')}>
            Pending ({pendingOrders.length})
          </div>
          <div className={`tab ${activeTab==='cooking'?'active':''}`} onClick={() => setActiveTab('cooking')}>
            Cooking ({cookingOrders.length})
          </div>
        </div>

        {loading ? <div className="spinner" /> : displayed.length === 0 ? (
          <div className="empty-state"><div className="icon">{activeTab==='pending'?'📋':'🔥'}</div><p>No {activeTab} orders</p></div>
        ) : (
          <div className="grid grid-3">
            {displayed.map((order, i) => (
              <div key={order.id} className="order-card" style={{ animationDelay:`${i*80}ms` }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-token">{order.token_number}</div>
                    <div className="order-table">{order.table_number ? `Table ${order.table_number}` : 'No table'} • {order.customer_name}</div>
                  </div>
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                </div>
                <div className="order-items-list">
                  {order.items?.map((item, j) => (
                    <div key={j} className="order-item-row">
                      <span>{item.item_name} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <span>Total</span><span>₹{order.total_amount}</span>
                </div>
                <div style={{ fontSize:'.75rem', color:'var(--text-muted)', marginTop:8 }}>⏰ {timeSince(order.created_at)}</div>
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => updateStatus(order.id, 'cooking')}>🔥 Start Cooking</button>
                  )}
                  {order.status === 'cooking' && (
                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'ready')}>✅ Mark Ready</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, 'cancelled')}>✕ Cancel</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
