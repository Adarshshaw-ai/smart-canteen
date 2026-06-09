import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          authFetch('/api/admin/stats').then(r => r.json()),
          authFetch(`/api/admin/reports?period=${period}`).then(r => r.json()),
        ]);
        setStats(s); setReport(r);
      } catch {} finally { setLoading(false); }
    })();
  }, [period]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div className="spinner" /></div>;

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🛡️</span> Admin Panel</div>
        <div className="navbar-links">
          <Link to="/admin/menu" className="nav-link">Menu</Link>
          <Link to="/admin/qr" className="nav-link">QR Codes</Link>
          <Link to="/admin/orders" className="nav-link">Orders</Link>
          <Link to="/admin/reports" className="nav-link active">Reports</Link>
          <Link to="/admin/staff" className="nav-link">Staff</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/profile" className="nav-link">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header"><h1>Reports & Analytics</h1><p>Canteen performance overview</p></div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', marginBottom:32 }}>
            <div className="stat-card"><div className="stat-icon orange">📦</div><div><div className="stat-value">{stats.totalOrders}</div><div className="stat-label">Total Orders</div></div></div>
            <div className="stat-card"><div className="stat-icon green">💰</div><div><div className="stat-value">₹{stats.totalRevenue}</div><div className="stat-label">Total Revenue</div></div></div>
            <div className="stat-card"><div className="stat-icon gold">📋</div><div><div className="stat-value">{stats.todayOrders}</div><div className="stat-label">Today's Orders</div></div></div>
            <div className="stat-card"><div className="stat-icon blue">💵</div><div><div className="stat-value">₹{stats.todayRevenue}</div><div className="stat-label">Today's Revenue</div></div></div>
          </div>
        )}

        {/* Period filter */}
        <div className="tabs" style={{ maxWidth:400, marginBottom:28 }}>
          {[['all','All Time'],['today','Today'],['week','This Week'],['month','This Month']].map(([v,l]) => (
            <div key={v} className={`tab ${period===v?'active':''}`} onClick={() => { setPeriod(v); setLoading(true); }}>{l}</div>
          ))}
        </div>

        {report && (
          <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* Popular Items */}
            <div className="card">
              <h3 style={{ marginBottom:16 }}>🔥 Popular Items</h3>
              {report.popularItems.length === 0 ? <p style={{ color:'var(--text-muted)' }}>No data</p> : (
                <table className="data-table">
                  <thead><tr><th>#</th><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {report.popularItems.map((item, i) => (
                      <tr key={i}>
                        <td style={{ color:'var(--accent)', fontWeight:700 }}>{i+1}</td>
                        <td>{item.item_name}</td>
                        <td>{item.qty}</td>
                        <td style={{ fontWeight:600 }}>₹{item.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sales by Category */}
            <div className="card">
              <h3 style={{ marginBottom:16 }}>📊 Sales by Category</h3>
              {report.salesByCategory.length === 0 ? <p style={{ color:'var(--text-muted)' }}>No data</p> : (
                <>
                  {report.salesByCategory.map((cat, i) => {
                    const maxRev = Math.max(...report.salesByCategory.map(c => c.revenue));
                    const pct = maxRev > 0 ? (cat.revenue / maxRev) * 100 : 0;
                    return (
                      <div key={i} style={{ marginBottom:16 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:'.9rem' }}>
                          <span>{cat.category}</span>
                          <span style={{ fontWeight:600 }}>₹{cat.revenue} ({cat.qty} sold)</span>
                        </div>
                        <div style={{ height:8, background:'var(--bg-secondary)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--accent),var(--gold))', borderRadius:4, transition:'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Order Status Breakdown */}
            <div className="card">
              <h3 style={{ marginBottom:16 }}>📈 Order Status</h3>
              {report.ordersByStatus.length === 0 ? <p style={{ color:'var(--text-muted)' }}>No data</p> : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                  {report.ordersByStatus.map((s, i) => (
                    <div key={i} className="stat-card" style={{ flex:'1 1 120px', padding:16 }}>
                      <div><div className="stat-value" style={{ fontSize:'1.4rem' }}>{s.count}</div><div className="stat-label">{s.status}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Sales */}
            <div className="card">
              <h3 style={{ marginBottom:16 }}>📅 Daily Sales</h3>
              {report.dailySales.length === 0 ? <p style={{ color:'var(--text-muted)' }}>No data</p> : (
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {report.dailySales.map((d, i) => (
                      <tr key={i}>
                        <td>{d.day}</td>
                        <td>{d.orders}</td>
                        <td style={{ fontWeight:600, color:'var(--accent)' }}>₹{d.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
