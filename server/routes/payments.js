const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Admin: Get payment configurations
router.get('/config', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT method_name, config_data, is_active FROM payment_configs');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment configs' });
  }
});

// Admin: Update payment configuration
router.post('/config', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { method_name, config_data, is_active } = req.body;
  try {
    await db.query(
      'INSERT INTO payment_configs (method_name, config_data, is_active, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (method_name) DO UPDATE SET config_data = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP',
      [method_name, config_data, is_active]
    ) ;
    res.json({ message: 'Configuration saved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Customer: Get active payment methods
router.get('/methods', async (req, res) => {
  try {
    const result = await db.query('SELECT method_name FROM payment_configs WHERE is_active = true');
    res.json(result.rows.map(r => r.method_name));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Customer: Create Razorpay Order
router.post('/create-razorpay-order', async (req, res) => {
  const { amount, order_id } = req.body; // amount in INR
  try {
    const configResult = await db.query('SELECT config_data FROM payment_configs WHERE method_name = $1 AND is_active = true', ['Razorpay']);
    if (configResult.rows.length === 0) return res.status(400).json({ error: 'Razorpay not configured' });
    
    const { key_id, key_secret } = configResult.rows[0].config_data;
    const razorpay = new Razorpay({ key_id, key_secret });

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${order_id}`,
    };

    const order = await razorpay.orders.create(options);

    // Save Razorpay order ID to internal order for webhook matching
    await db.query(
      "UPDATE orders SET payment_details = payment_details || $1::jsonb WHERE id = $2",
      [JSON.stringify({ razorpay_order_id: order.id }), order_id]
    );

    res.json({ ...order, key_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Customer: Verify Razorpay Payment
router.post('/verify-razorpay', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internal_order_id } = req.body;
  try {
    const configResult = await db.query('SELECT config_data FROM payment_configs WHERE method_name = $1', ['Razorpay']);
    if (configResult.rows.length === 0) return res.status(400).json({ error: 'Razorpay not configured' });
    const { key_secret } = configResult.rows[0].config_data;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', key_secret).update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
      const updateResult = await db.query(
        'UPDATE orders SET payment_status = $1, payment_id = $2, payment_details = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        ['paid', razorpay_payment_id, JSON.stringify(req.body), internal_order_id]
      );
      const order = updateResult.rows[0];

      // Emit to kitchen now that it's paid
      if (req.app.get('io')) {
        const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
        req.app.get('io').emit('new-order', { ...order, items: oisResult.rows });
      }

      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Razorpay Webhook
router.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'canteen_secret';
  const signature = req.headers['x-razorpay-signature'];

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (signature === digest) {
    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const payload = req.body.payload.payment ? req.body.payload.payment.entity : req.body.payload.order.entity;
      const razorpayOrderId = payload.order_id;
      
      // Find order by razorpay_order_id in payment_details JSONB
      const orderResult = await db.query(
        "SELECT * FROM orders WHERE payment_details->>'razorpay_order_id' = $1 OR payment_details->>'id' = $1", 
        [razorpayOrderId]
      );
      const order = orderResult.rows[0];

      if (order && order.payment_status !== 'paid') {
        const updateResult = await db.query(
          'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          ['paid', order.id]
        );
        const updatedOrder = updateResult.rows[0];

        // Emit to kitchen
        if (req.app.get('io')) {
          const oisResult = await db.query('SELECT * FROM order_items WHERE order_id=$1', [updatedOrder.id]);
          req.app.get('io').emit('new-order', { ...updatedOrder, items: oisResult.rows });
        }
      }
    }
    res.json({ status: 'ok' });
  } else {
    res.status(400).send('Invalid signature');
  }
});

module.exports = router;
