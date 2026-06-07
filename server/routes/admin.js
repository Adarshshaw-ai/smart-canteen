const express = require('express');
const QRCode = require('qrcode');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const totalOrdersResult = await db.query('SELECT COUNT(*) as c FROM orders');
    const totalOrders = totalOrdersResult.rows[0].c;
    
    const todayOrdersResult = await db.query("SELECT COUNT(*) as c FROM orders WHERE DATE(created_at)=CURRENT_DATE");
    const todayOrders = todayOrdersResult.rows[0].c;
    
    const totalRevenueResult = await db.query("SELECT COALESCE(SUM(total_amount),0) as s FROM orders WHERE status != 'cancelled'");
    const totalRevenue = totalRevenueResult.rows[0].s;
    
    const todayRevenueResult = await db.query("SELECT COALESCE(SUM(total_amount),0) as s FROM orders WHERE DATE(created_at)=CURRENT_DATE AND status != 'cancelled'");
    const todayRevenue = todayRevenueResult.rows[0].s;
    
    const totalItemsResult = await db.query('SELECT COUNT(*) as c FROM menu_items');
    const totalItems = totalItemsResult.rows[0].c;
    
    const pendingOrdersResult = await db.query("SELECT COUNT(*) as c FROM orders WHERE status='pending'");
    const pendingOrders = pendingOrdersResult.rows[0].c;
    
    const activeOrdersResult = await db.query("SELECT COUNT(*) as c FROM orders WHERE status IN ('pending','cooking','ready')");
    const activeOrders = activeOrdersResult.rows[0].c;
    
    res.json({ totalOrders, todayOrders, totalRevenue, todayRevenue, totalItems, pendingOrders, activeOrders });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Sales reports
router.get('/reports', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { period } = req.query; // 'today','week','month','all'
    let dateFilter = '';
    if (period === 'today') dateFilter = "AND DATE(o.created_at)=CURRENT_DATE";
    else if (period === 'week') dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    else if (period === 'month') dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const salesByCategoryResult = await db.query(`
      SELECT mi.category, SUM(oi.quantity) as qty, SUM(oi.quantity*oi.price) as revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id=mi.id
      JOIN orders o ON oi.order_id=o.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY mi.category ORDER BY revenue DESC
    `);

    const popularItemsResult = await db.query(`
      SELECT oi.item_name, SUM(oi.quantity) as qty, SUM(oi.quantity*oi.price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id=o.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY oi.item_name ORDER BY qty DESC LIMIT 10
    `);

    const dailySalesResult = await db.query(`
      SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total_amount) as revenue
      FROM orders WHERE status != 'cancelled' ${dateFilter.replace(/o\./g, '')}
      GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30
    `);

    const ordersByStatusResult = await db.query(`
      SELECT status, COUNT(*) as count FROM orders ${dateFilter ? 'WHERE 1=1 '+dateFilter.replace(/o\./g,'') : ''} GROUP BY status
    `);

    res.json({
      salesByCategory: salesByCategoryResult.rows,
      popularItems: popularItemsResult.rows,
      dailySales: dailySalesResult.rows,
      ordersByStatus: ordersByStatusResult.rows
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// QR codes
router.get('/tables', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables_config ORDER BY table_number');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch tables' }); }
});

router.post('/tables', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { table_number } = req.body;
    await db.query('INSERT INTO tables_config (table_number) VALUES ($1)', [table_number]);
    res.status(201).json({ message: 'Table added' });
  } catch(e) { res.status(400).json({ error: 'Table already exists' }); }
});

router.post('/qr/:tableNumber', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { baseUrl } = req.body;
    const url = `${baseUrl || 'http://localhost:5173'}/?table=${tableNumber}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#1A1A2E', light: '#FFFFFF' } });
    await db.query('UPDATE tables_config SET qr_data=$1 WHERE table_number=$2', [qrDataUrl, tableNumber]);
    res.json({ qr: qrDataUrl, url });
  } catch(e) { res.status(500).json({ error: 'Failed to generate QR' }); }
});

// User management
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id,username,role,name,created_at FROM users ORDER BY role,name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

module.exports = router;
