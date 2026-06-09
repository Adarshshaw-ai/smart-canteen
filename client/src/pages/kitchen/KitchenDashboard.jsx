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
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('All');
  const [viewMode, setViewMode] = useState('orders'); // 'orders' or 'batch'
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    try {
      const [oRes1, oRes2, sRes] = await Promise.all([
        authFetch('/api/orders?status=pending'),
        authFetch('/api/orders?status=cooking'),
        authFetch('/api/menu/stations')
      ]);
      const pending = await oRes1.json();
      const cooking = await oRes2.json();
      const stationList = await sRes.json();
      
      setOrders([...pending, ...cooking]);
      setStations(['All', ...stationList]);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

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

  // Filtering Logic
  const filteredOrders = orders.filter(o => {
    if (selectedStation === 'All') return true;
    return o.items.some(item => item.station === selectedStation);
  });

  const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
  const cookingOrders = filteredOrders.filter(o => o.status === 'cooking');
  const displayed = activeTab === 'pending' ? pendingOrders : cookingOrders;

  // Batch Calculation
  const batchData = [];
  displayed.forEach(order => {
    order.items.forEach(item => {
      if (selectedStation !== 'All' && item.station !== selectedStation) return;
      const existing = batchData.find(b => b.menu_item_id === item.menu_item_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.orders.push(order.token_number);
      } else {
        batchData.push({ 
          menu_item_id: item.menu_item_id, 
          item_name: item.item_name, 
          quantity: item.quantity, 
          station: item.station,
          orders: [order.token_number] 
        });
      }
    });
  });

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
        {/* Station Filter */}
        <div style={{ marginBottom: 20, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8 }}>
          {stations.map(s => (
            <button 
              key={s} 
              className={`btn btn-sm ${selectedStation === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ marginRight: 8 }}
              onClick={() => setSelectedStation(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Stats & View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', flex: 1, marginBottom: 0 }}>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-icon gold">📋</div>
              <div><div className="stat-value">{pendingOrders.length}</div><div className="stat-label">Pending</div></div>
            </div>
            <div className="stat-card" style={{ padding: '12px 16px' }}>
              <div className="stat-icon orange">🔥</div>
              <div><div className="stat-value">{cookingOrders.length}</div><div className="stat-label">Cooking</div></div>
            </div>
          </div>
          
          <div className="tabs" style={{ margin: 0, width: 'auto' }}>
            <div className={`tab ${viewMode === 'orders' ? 'active' : ''}`} onClick={() => setViewMode('orders')}>Order View</div>
            <div className={`tab ${viewMode === 'batch' ? 'active' : ''}`} onClick={() => setViewMode('batch')}>Batch View</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ maxWidth: 400, marginBottom: 24 }}>
          <div className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            {activeTab === 'pending' ? '🔔' : ''} Pending Orders
          </div>
          <div className={`tab ${activeTab === 'cooking' ? 'active' : ''}`} onClick={() => setActiveTab('cooking')}>
            {activeTab === 'cooking' ? '🔥' : ''} Cooking Orders
          </div>
        </div>

        {loading ? <div className="spinner" /> : displayed.length === 0 ? (
          <div className="empty-state"><div className="icon">{activeTab === 'pending' ? '📋' : '🔥'}</div><p>No {activeTab} orders for {selectedStation}</p></div>
        ) : viewMode === 'batch' ? (
          <div className="grid grid-3">
            {batchData.map((item, i) => (
              <div key={item.menu_item_id} className="order-card fade-in" style={{ animationDelay: `${i * 50}ms`, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 style={{ margin: 0 }}>{item.item_name}</h3>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>× {item.quantity}</div>
                </div>
                <div style={{ marginTop: 12, fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Stations:</strong> {item.station}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.orders.map(t => (
                    <span key={t} className="badge badge-pending" style={{ fontSize: '.7rem' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-3">
            {displayed.map((order, i) => (
              <div key={order.id} className="order-card" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-token">{order.token_number}</div>
                    <div className="order-table">{order.table_number ? `Table ${order.table_number}` : 'No table'} • {order.customer_name}</div>
                  </div>
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                </div>
                <div className="order-items-list">
                  {order.items?.map((item, j) => (
                    <div 
                      key={j} 
                      className="order-item-row" 
                      style={{ 
                        opacity: selectedStation !== 'All' && item.station !== selectedStation ? 0.4 : 1,
                        background: selectedStation !== 'All' && item.station === selectedStation ? 'rgba(255, 107, 53, 0.05)' : 'transparent',
                        padding: '4px 8px',
                        borderRadius: 4
                      }}
                    >
                      <span style={{ fontWeight: selectedStation !== 'All' && item.station === selectedStation ? 600 : 400 }}>
                        {item.item_name} × {item.quantity}
                      </span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{item.station}</span>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <span>Total</span><span>₹{order.total_amount}</span>
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 8 }}>⏰ {timeSince(order.created_at)}</div>
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
