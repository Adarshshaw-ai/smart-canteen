const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Public: get available items
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch items' }); }
});

router.get('/available', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM menu_items WHERE available = 1 AND stock_quantity > 0 ORDER BY category, name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch items' }); }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT category FROM menu_items WHERE stock_quantity > 0 ORDER BY category');
    res.json(result.rows.map(c => c.category));
  } catch(e) { res.status(500).json({ error: 'Failed to fetch categories' }); }
});

router.get('/stations', async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT station FROM menu_items ORDER BY station');
    res.json(result.rows.map(s => s.station));
  } catch(e) { res.status(500).json({ error: 'Failed to fetch stations' }); }
});

// Admin: CRUD
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { name, description, price, category, image_url, prep_time, stock_quantity, station } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: 'Name, price, category required' });
  try {
    const r = await db.query(
      'INSERT INTO menu_items (name,description,price,category,image_url,prep_time,stock_quantity,station) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, description||'', price, category, image_url||'', prep_time||10, stock_quantity||0, station||'Main Kitchen']
    );
    res.status(201).json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: 'Failed to add item' }); }
});

router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { name, description, price, category, image_url, available, prep_time, stock_quantity, station } = req.body;
  try {
    const r = await db.query(
      'UPDATE menu_items SET name=$1,description=$2,price=$3,category=$4,image_url=$5,available=$6,prep_time=$7,stock_quantity=$8,station=$9 WHERE id=$10 RETURNING *',
      [name, description||'', price, category, image_url||'', available?1:0, prep_time||10, stock_quantity||0, station||'Main Kitchen', req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: 'Failed to update item' }); }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM menu_items WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ error: 'Failed to delete item' }); }
});

router.patch('/:id/toggle', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const r = await db.query(
      'UPDATE menu_items SET available = CASE WHEN available = 1 THEN 0 ELSE 1 END WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: 'Failed to toggle item' }); }
});

module.exports = router;
