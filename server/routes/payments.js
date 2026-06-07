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
      await db.query(
        'UPDATE orders SET payment_status = $1, payment_id = $2, payment_details = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        ['paid', razorpay_payment_id, JSON.stringify(req.body), internal_order_id]
      );
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
