const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Ensure environment variables are loaded regardless of where the process is started
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('error', (err) => console.error('Unexpected error on idle client', err));

// Initialize tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin','kitchen','counter')),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_url TEXT DEFAULT '',
        available INTEGER DEFAULT 1,
        prep_time INTEGER DEFAULT 10,
        stock_quantity INTEGER DEFAULT 100,
        station VARCHAR(100) DEFAULT 'Main Kitchen',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns exist for existing databases
    await pool.query("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 100");
    await pool.query("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS station VARCHAR(100) DEFAULT 'Main Kitchen'");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        token_number VARCHAR(255) UNIQUE NOT NULL,
        table_number INTEGER,
        customer_name VARCHAR(255) DEFAULT 'Guest',
        customer_phone VARCHAR(255) DEFAULT '',
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending','cooking','ready','completed','cancelled')),
        payment_method VARCHAR(50) DEFAULT 'cash',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_id VARCHAR(255),
        payment_details JSONB DEFAULT '{}',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'");
    await pool.query("ALTER TABLE orders ALTER COLUMN payment_details SET DEFAULT '{}'");
    await pool.query("UPDATE orders SET payment_details = '{}' WHERE payment_details IS NULL");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_configs (
        id SERIAL PRIMARY KEY,
        method_name VARCHAR(100) UNIQUE NOT NULL,
        config_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tables_config (
        id SERIAL PRIMARY KEY,
        table_number INTEGER UNIQUE NOT NULL,
        qr_data TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'available'
      );
    `);

    // Seed defaults
    const anyUserExists = await pool.query('SELECT id FROM users LIMIT 1');
    if (anyUserExists.rows.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️ No users found. Setup required.');
      }
      
      const itemsCount = await pool.query('SELECT COUNT(*) as c FROM menu_items');
      if (parseInt(itemsCount.rows[0].c) === 0) {
        const items = [
          ['Masala Dosa','Crispy dosa with potato masala',60,'South Indian',8,'Grill'],
          ['Idli Sambar','Steamed idlis with sambar & chutney',40,'South Indian',5,'Steam'],
          ['Paneer Butter Masala','Rich paneer in creamy tomato gravy',120,'North Indian',15,'Main Course'],
          ['Veg Biryani','Fragrant basmati rice with mixed vegetables',100,'Rice',12,'Main Course'],
          ['Chicken Biryani','Aromatic rice with tender chicken pieces',150,'Rice',15,'Main Course'],
          ['Samosa (2 pcs)','Crispy pastry with spiced potato filling',20,'Snacks',3,'Fryer'],
          ['Vada Pav','Spicy potato fritter in a bun',25,'Snacks',4,'Snacks'],
          ['Chole Bhature','Spicy chickpeas with fried bread',80,'North Indian',10,'Fryer'],
          ['Chai','Hot Indian masala tea',15,'Beverages',3,'Beverages'],
          ['Cold Coffee','Chilled coffee with ice cream',50,'Beverages',5,'Beverages'],
          ['Fresh Lime Soda','Refreshing lemon soda',30,'Beverages',3,'Beverages'],
          ['Naan','Soft tandoori bread',30,'Breads',5,'Tandoor'],
          ['Aloo Paratha','Stuffed potato flatbread with butter',50,'Breads',8,'Grill'],
          ['Gulab Jamun (2 pcs)','Sweet milk dumplings in sugar syrup',40,'Desserts',2,'Desserts'],
          ['Rasgulla (2 pcs)','Soft cottage cheese balls in syrup',35,'Desserts',2,'Desserts'],
        ];

        for (const item of items) {
          await pool.query(
            'INSERT INTO menu_items (name, description, price, category, prep_time, station) VALUES ($1, $2, $3, $4, $5, $6)',
            item
          );
        }

        for (let i = 1; i <= 10; i++) {
          await pool.query('INSERT INTO tables_config (table_number) VALUES ($1)', [i]);
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Database seeded with default menu items');
        }
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Initialize on startup and handle errors
initializeDatabase().catch(err => {
  console.error('❌ Fatal database error:', err.message);
  process.exit(1);
});

module.exports = pool;
