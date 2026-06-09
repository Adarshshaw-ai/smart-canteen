const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

function generateToken() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `TKN-${ds}-${r}`;
}

// Customer: place order (public)
router.post('/', async (req, res) => {
  const { table_number, customer_name, customer_phone, items, payment_method } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Order must have items' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const orderItems = [];
    for (const item of items) {
      // Lock row for stock update
      const result = await client.query('SELECT * FROM menu_items WHERE id=$1 AND available=1 FOR UPDATE', [item.id]);
      const mi = result.rows[0];
      if (!mi) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Item "${item.name || item.id}" unavailable` });
      }
      if (mi.stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for ${mi.name}` });
      }

      total += mi.price * item.quantity;
      orderItems.push({ menu_item_id: mi.id, item_name: mi.name, quantity: item.quantity, price: mi.price });

      // Reserve stock
      await client.query('UPDATE menu_items SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, mi.id]);
    }

    let tkn = generateToken();
    let existing = await client.query('SELECT id FROM orders WHERE token_number=$1', [tkn]);
    while (existing.rows.length > 0) {
      tkn = generateToken();
      existing = await client.query('SELECT id FROM orders WHERE token_number=$1', [tkn]);
    }

    // Set expiration for digital payments (5 minutes)
    const expiresAt = payment_method === 'Razorpay' ? new Date(Date.now() + 5 * 60000) : null;

    const orderResult = await client.query(
      'INSERT INTO orders (token_number,table_number,customer_name,customer_phone,total_amount,payment_method,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [tkn, table_number||null, customer_name||'Guest', customer_phone||'', total, payment_method||'cash', expiresAt]
    );
    const order = orderResult.rows[0];

    for (const oi of orderItems) {
      await client.query(
        'INSERT INTO order_items (order_id,menu_item_id,item_name,quantity,price) VALUES ($1,$2,$3,$4,$5)',
        [order.id, oi.menu_item_id, oi.item_name, oi.quantity, oi.price]
      );
    }

    await client.query('COMMIT');

    const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    const result = { ...order, items: oisResult.rows };

    // Emit via socket ONLY if it's not an unpaid digital order
    if (req.app.get('io') && payment_method !== 'Razorpay') {
      req.app.get('io').emit('new-order', result);
    }

    res.status(201).json(result);
  } catch(e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    client.release();
  }
});

// Get orders by status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) {
      sql += ' WHERE status=$1';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    if (limit) {
      sql += ' LIMIT $' + (params.length + 1);
      params.push(parseInt(limit));
    }
    if (offset) {
      sql += ' OFFSET $' + (params.length + 1);
      params.push(parseInt(offset));
    }
    const ordersResult = await db.query(sql, params);
    const orders = ordersResult.rows;
    
    const result = [];
    for (const o of orders) {
      const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [o.id]);
      result.push({ ...o, items: oisResult.rows });
    }
    res.json(result);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order by token
router.get('/token/:token', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders WHERE token_number=$1', [req.params.token]);
    const order = result.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    order.items = oisResult.rows;
    res.json(order);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch order' }); }
});

// Get single order by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    const order = result.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    order.items = oisResult.rows;
    res.json(order);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch order' }); }
});

// Update order status
router.patch('/:id/status', authenticateToken, authorizeRole('kitchen','counter','admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','cooking','ready','completed','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updateResult = await db.query(
      'UPDATE orders SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    const order = updateResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    order.items = oisResult.rows;

    if (req.app.get('io')) {
      req.app.get('io').emit('order-updated', order);
    }
    res.json(order);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update payment status
router.patch('/:id/payment', authenticateToken, authorizeRole('counter','admin'), async (req, res) => {
  try {
    const { payment_status } = req.body;
    const updateResult = await db.query(
      'UPDATE orders SET payment_status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [payment_status, req.params.id]
    );
    const order = updateResult.rows[0];
    const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
    order.items = oisResult.rows;
    res.json(order);
  } catch(e) { res.status(500).json({ error: 'Failed to update payment' }); }
});

module.exports = router;
