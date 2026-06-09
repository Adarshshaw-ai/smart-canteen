import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OrderHistory() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const url = filter === 'all' ? '/api/orders' : `/api/orders?status=${filter}`;
        const res = await authFetch(url);
        setOrders(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [filter]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🛡️</span> Admin Panel</div>
        <div className="navbar-links">
          <Link to="/admin/menu" className="nav-link">Menu</Link>
          <Link to="/admin/qr" className="nav-link">QR Codes</Link>
          <Link to="/admin/orders" className="nav-link active">Orders</Link>
          <Link to="/admin/reports" className="nav-link">Reports</Link>
          <Link to="/admin/staff" className="nav-link">Staff</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/profile" className="nav-link">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header"><h1>Order History</h1><p>{orders.length} orders</p></div>
        <div className="tabs" style={{ maxWidth:600, marginBottom:24 }}>
          {['all','pending','cooking','ready','completed','cancelled'].map(s => (
            <div key={s} className={`tab ${filter===s?'active':''}`} onClick={() => { setFilter(s); setLoading(true); }}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </div>
          ))}
        </div>
        {loading ? <div className="spinner" /> : orders.length === 0 ? (
          <div className="empty-state"><div className="icon">📦</div><p>No orders found</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Token</th><th>Customer</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Time</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight:700, color:'var(--accent)' }}>{o.token_number}</td>
                    <td>{o.customer_name}<br/><span style={{ fontSize:'.75rem', color:'var(--text-muted)' }}>{o.customer_phone}</span></td>
                    <td>{o.table_number || '-'}</td>
                    <td>{o.items?.map(i => `${i.item_name}×${i.quantity}`).join(', ')}</td>
                    <td style={{ fontWeight:600 }}>₹{o.total_amount}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td><span className={`badge ${o.payment_status==='paid'?'badge-ready':'badge-pending'}`}>{o.payment_status}</span></td>
                    <td style={{ fontSize:'.8rem', color:'var(--text-muted)' }}>{new Date(o.created_at+'Z').toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
