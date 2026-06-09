const db = require('../db');

async function cleanupExpiredOrders(io) {
  const client = await db.connect();
  try {
    // Find orders that are pending, unpaid, digital (Razorpay), and expired
    const expiredResult = await client.query(`
      SELECT * FROM orders 
      WHERE status = 'pending' 
      AND payment_status = 'pending' 
      AND payment_method = 'Razorpay' 
      AND expires_at < CURRENT_TIMESTAMP
    `);

    for (const order of expiredResult.rows) {
      try {
        await client.query('BEGIN');

        // Update order status to cancelled
        const updateResult = await client.query(
          "UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
          [order.id]
        );
        const cancelledOrder = updateResult.rows[0];

        // Release stock
        const itemsResult = await client.query('SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1', [order.id]);
        for (const item of itemsResult.rows) {
          await client.query(
            'UPDATE menu_items SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.menu_item_id]
          );
        }

        await client.query('COMMIT');

        // Emit notification to user
        if (io) {
          io.emit('order-cancelled', cancelledOrder);
        }

        console.log(`🧹 Auto-cancelled expired order #${order.token_number}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to auto-cancel order ${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error in cleanup job:', err);
  } finally {
    client.release();
  }
}

function startCleanupJob(io) {
  console.log('⏳ Starting background cleanup job (60s interval)');
  setInterval(() => cleanupExpiredOrders(io), 60000);
}

module.exports = startCleanupJob;
