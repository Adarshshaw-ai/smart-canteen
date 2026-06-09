import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function QRGenerator() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [newTable, setNewTable] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    try {
      const res = await authFetch('/api/admin/tables');
      setTables(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTables(); }, []);

  const generateQR = async (tableNum) => {
    try {
      const res = await authFetch(`/api/admin/qr/${tableNum}`, {
        method: 'POST', body: JSON.stringify({ baseUrl }),
      });
      const data = await res.json();
      toast.success(`QR generated for Table ${tableNum}`);
      fetchTables();
    } catch { toast.error('Failed to generate QR'); }
  };

  const generateAll = async () => {
    for (const t of tables) { await generateQR(t.table_number); }
    toast.success('All QR codes generated!');
  };

  const addTable = async () => {
    if (!newTable) return;
    try {
      await authFetch('/api/admin/tables', { method: 'POST', body: JSON.stringify({ table_number: parseInt(newTable) }) });
      setNewTable('');
      fetchTables();
      toast.success('Table added');
    } catch { toast.error('Failed to add table'); }
  };

  const printQR = (table) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Table ${table.table_number} QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}img{width:300px;height:300px;}</style></head><body><h1>Table ${table.table_number}</h1><img src="${table.qr_data}" /><p>Scan to order</p></body></html>`);
    w.document.close();
    w.print();
  };

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div style={{ minHeight:'100vh' }}>
      <div className="navbar">
        <div className="navbar-brand"><span className="icon">🛡️</span> Admin Panel</div>
        <div className="navbar-links">
          <Link to="/admin/menu" className="nav-link">Menu</Link>
          <Link to="/admin/qr" className="nav-link active">QR Codes</Link>
          <Link to="/admin/orders" className="nav-link">Orders</Link>
          <Link to="/admin/reports" className="nav-link">Reports</Link>
          <Link to="/admin/staff" className="nav-link">Staff</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/profile" className="nav-link">Profile</Link>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="page">
        <div className="page-header"><h1>QR Code Generator</h1><p>Generate QR codes for table ordering</p></div>
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'end' }}>
            <div className="input-group" style={{ marginBottom:0, flex:1, minWidth:200 }}>
              <label>Base URL</label>
              <input className="input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom:0 }}>
              <label>Add Table #</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" type="number" value={newTable} onChange={e => setNewTable(e.target.value)} style={{ width:100 }} />
                <button className="btn btn-primary" onClick={addTable}>Add</button>
              </div>
            </div>
            <button className="btn btn-success" onClick={generateAll}>Generate All QR Codes</button>
          </div>
        </div>
        {loading ? <div className="spinner" /> : (
          <div className="grid grid-4">
            {tables.map(t => (
              <div key={t.id} className="card fade-in" style={{ textAlign:'center' }}>
                <h3 style={{ marginBottom:12 }}>Table {t.table_number}</h3>
                {t.qr_data ? (
                  <>
                    <img src={t.qr_data} alt={`Table ${t.table_number}`} style={{ width:'100%', maxWidth:200, borderRadius:8, marginBottom:12 }} />
                    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => printQR(t)}>🖨️ Print</button>
                      <button className="btn btn-sm btn-primary" onClick={() => generateQR(t.table_number)}>🔄</button>
                    </div>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={() => generateQR(t.table_number)}>Generate QR</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
