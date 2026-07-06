import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OrderVerification() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [searchToken, setSearchToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const searchOrder = async (e) => {
    e.preventDefault();
    if (!searchToken.trim()) return toast.error('Enter a token number');
    setLoading(true); setNotFound(false); setOrder(null);
    try {
      const res = await fetch(`/api/orders/token/${searchToken.trim()}`);
      if (!res.ok) { setNotFound(true); return; }
      setOrder(await res.json());
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (status) => {
    try {
      await authFetch(`/api/orders/${order.id}/status`, { method:'PATCH', body:JSON.stringify({ status }) });
      setOrder({ ...order, status });
      toast.success(`Order marked as ${status}`);
    } catch { toast.error('Failed'); }
  };

  const markPaid = async () => {
    try {
      await authFetch(`/api/orders/${order.id}/payment`, { method:'PATCH', body:JSON.stringify({ payment_status:'paid' }) });
      setOrder({ ...order, payment_status:'paid' });
      toast.success('Payment recorded');
    } catch { toast.error('Failed'); }
  };

  const handleLogout = () => { logout(); navigate('/counter/login'); };

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🧾</span> Counter Dashboard</div>
        <div className="navbar-links">
          <Link to="/counter" className="nav-link">Active Orders</Link>
          <Link to="/counter/verify" className="nav-link active">Verify Order</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header"><h1>Order Verification</h1><p>Search and verify orders by token number</p></div>

        <div className="card" style={{ maxWidth:600, marginBottom:32 }}>
          <form onSubmit={searchOrder} style={{ display:'flex', gap:12 }}>
            <input className="input" placeholder="Enter token (e.g. TKN-20260503-1234)" value={searchToken}
              onChange={e => setSearchToken(e.target.value)} style={{ flex:1 }} autoFocus />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '...' : '🔍 Search'}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="card" style={{ maxWidth:600, textAlign:'center', padding:40 }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>❌</div>
            <h3>Order Not Found</h3>
            <p style={{ color:'var(--text-secondary)', marginTop:8 }}>No order found with token "{searchToken}"</p>
          </div>
        )}

        {order && (
          <div className="card slide-up" style={{ maxWidth:600 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--accent)' }}>{order.token_number}</div>
                <div style={{ color:'var(--text-secondary)', fontSize:'.9rem' }}>
                  {order.customer_name} {order.table_number ? `• Table ${order.table_number}` : ''}
                </div>
                {order.customer_phone && <div style={{ color:'var(--text-muted)', fontSize:'.8rem' }}>📞 {order.customer_phone}</div>}
              </div>
              <span className={`badge badge-${order.status}`}>{order.status}</span>
            </div>

            <div style={{ background:'var(--bg-secondary)', borderRadius:'var(--radius)', padding:16, marginBottom:16 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:'.9rem' }}>
                  <span>{item.item_name} × {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div style={{ borderTop:'1px solid var(--border)', marginTop:10, paddingTop:10, fontWeight:700, display:'flex', justifyContent:'space-between', fontSize:'1.1rem' }}>
                <span>Total</span><span style={{ color:'var(--accent)' }}>₹{order.total_amount}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
              <span className={`badge ${order.payment_status==='paid'?'badge-ready':'badge-pending'}`}>
                💳 {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
              <span style={{ fontSize:'.8rem', color:'var(--text-muted)' }}>
                📅 {new Date(order.created_at+'Z').toLocaleString()}
              </span>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {order.payment_status !== 'paid' && (
                <button className="btn btn-warning btn-sm" onClick={markPaid}>💰 Mark Paid</button>
              )}
              {order.status === 'ready' && (
                <button className="btn btn-success btn-sm" onClick={() => updateStatus('completed')}>✅ Complete</button>
              )}
              {['pending','cooking'].includes(order.status) && (
                <button className="btn btn-danger btn-sm" onClick={() => updateStatus('cancelled')}>✕ Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
