import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.sqlite');

let db;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');
  
  return db;
}

export async function initDb() {
  const database = await getDb();
  
  // Create Roommates table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS roommates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT
    )
  `);
  
  // Create Expenses table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      amount_spent REAL NOT NULL,
      purchased_by_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'common_fund', -- 'common_fund' or 'out_of_pocket'
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (purchased_by_id) REFERENCES roommates(id)
    )
  `);
  
  // Create Contributions table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contributor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contributor_id) REFERENCES roommates(id)
    )
  `);
  
  // Create Inventory table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_name TEXT UNIQUE NOT NULL,
      quantity_available REAL NOT NULL DEFAULT 0.0,
      unit TEXT NOT NULL,
      min_stock_level REAL NOT NULL
    )
  `);
  
  // Create Requests table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      requested_by_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_by_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (requested_by_id) REFERENCES roommates(id),
      FOREIGN KEY (completed_by_id) REFERENCES roommates(id)
    )
  `);

  // Seed default roommates if table is empty
  const roommateCount = await database.get('SELECT COUNT(*) as count FROM roommates');
  if (roommateCount.count === 0) {
    console.log('Seeding default roommates...');
    const defaultRoommates = [
      { name: 'Aman Sharma', username: 'aman', password: 'password123', avatar_url: '' },
      { name: 'Birju Patel', username: 'birju', password: 'password123', avatar_url: '' },
      { name: 'Chirag Gupta', username: 'chirag', password: 'password123', avatar_url: '' },
      { name: 'Dev Reddy', username: 'dev', password: 'password123', avatar_url: '' },
      { name: 'Ehsan Khan', username: 'ehsan', password: 'password123', avatar_url: '' }
    ];
    
    for (const rm of defaultRoommates) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(rm.password, salt);
      await database.run(
        'INSERT INTO roommates (name, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)',
        [rm.name, rm.username, hash, rm.avatar_url]
      );
    }
  }

  // Seed default inventory items if table is empty
  const inventoryCount = await database.get('SELECT COUNT(*) as count FROM inventory');
  if (inventoryCount.count === 0) {
    console.log('Seeding predefined inventory items...');
    
    // Grouped by Category:
    // Grains: Rice, Wheat Flour, Poha, Suji
    // Pulses (Dal): Arhar Dal, Masoor Dal, Moong Dal, Chana Dal, Urad Dal
    // Vegetables: Potato, Onion, Tomato, Garlic, Ginger, Green Chilli
    // Spices: Turmeric, Red Chilli Powder, Coriander Powder, Garam Masala, Cumin, Mustard Seeds
    // Oils & Others: Cooking Oil, Salt, Sugar, Tea, Milk
    const predefinedItems = [
      // Grains
      { category: 'Grains', item_name: 'Rice', quantity_available: 8.0, unit: 'kg', min_stock_level: 5.0 },
      { category: 'Grains', item_name: 'Wheat Flour', quantity_available: 12.0, unit: 'kg', min_stock_level: 10.0 },
      { category: 'Grains', item_name: 'Poha', quantity_available: 1.5, unit: 'kg', min_stock_level: 1.0 },
      { category: 'Grains', item_name: 'Suji', quantity_available: 0.5, unit: 'kg', min_stock_level: 1.0 }, // triggers low stock warning
      
      // Pulses
      { category: 'Pulses (Dal)', item_name: 'Arhar Dal', quantity_available: 3.0, unit: 'kg', min_stock_level: 2.0 },
      { category: 'Pulses (Dal)', item_name: 'Masoor Dal', quantity_available: 1.5, unit: 'kg', min_stock_level: 1.0 },
      { category: 'Pulses (Dal)', item_name: 'Moong Dal', quantity_available: 0.8, unit: 'kg', min_stock_level: 1.0 }, // triggers low stock warning
      { category: 'Pulses (Dal)', item_name: 'Chana Dal', quantity_available: 2.0, unit: 'kg', min_stock_level: 1.0 },
      { category: 'Pulses (Dal)', item_name: 'Urad Dal', quantity_available: 0.4, unit: 'kg', min_stock_level: 1.0 }, // triggers low stock warning
      
      // Vegetables
      { category: 'Vegetables', item_name: 'Potato', quantity_available: 5.0, unit: 'kg', min_stock_level: 3.0 },
      { category: 'Vegetables', item_name: 'Onion', quantity_available: 2.0, unit: 'kg', min_stock_level: 3.0 }, // triggers low stock warning
      { category: 'Vegetables', item_name: 'Tomato', quantity_available: 1.5, unit: 'kg', min_stock_level: 2.0 }, // triggers low stock warning
      { category: 'Vegetables', item_name: 'Garlic', quantity_available: 300, unit: 'g', min_stock_level: 250 },
      { category: 'Vegetables', item_name: 'Ginger', quantity_available: 150, unit: 'g', min_stock_level: 200 }, // triggers low stock warning
      { category: 'Vegetables', item_name: 'Green Chilli', quantity_available: 250, unit: 'g', min_stock_level: 200 },
      
      // Spices
      { category: 'Spices', item_name: 'Turmeric', quantity_available: 150, unit: 'g', min_stock_level: 100 },
      { category: 'Spices', item_name: 'Red Chilli Powder', quantity_available: 80, unit: 'g', min_stock_level: 100 }, // triggers low stock warning
      { category: 'Spices', item_name: 'Coriander Powder', quantity_available: 120, unit: 'g', min_stock_level: 100 },
      { category: 'Spices', item_name: 'Garam Masala', quantity_available: 100, unit: 'g', min_stock_level: 50 },
      { category: 'Spices', item_name: 'Cumin', quantity_available: 150, unit: 'g', min_stock_level: 100 },
      { category: 'Spices', item_name: 'Mustard Seeds', quantity_available: 80, unit: 'g', min_stock_level: 50 },
      
      // Oils & Others
      { category: 'Oils & Others', item_name: 'Cooking Oil', quantity_available: 3.0, unit: 'litre', min_stock_level: 2.0 },
      { category: 'Oils & Others', item_name: 'Salt', quantity_available: 2.0, unit: 'kg', min_stock_level: 1.0 },
      { category: 'Oils & Others', item_name: 'Sugar', quantity_available: 1.0, unit: 'kg', min_stock_level: 2.0 }, // triggers low stock warning
      { category: 'Oils & Others', item_name: 'Tea', quantity_available: 2, unit: 'packets', min_stock_level: 1 },
      { category: 'Oils & Others', item_name: 'Milk', quantity_available: 0.5, unit: 'litre', min_stock_level: 1.0 } // triggers low stock warning
    ];

    for (const item of predefinedItems) {
      await database.run(
        'INSERT INTO inventory (category, item_name, quantity_available, unit, min_stock_level) VALUES (?, ?, ?, ?, ?)',
        [item.category, item.item_name, item.quantity_available, item.unit, item.min_stock_level]
      );
    }
  }
  
  // Database schema migration for roommate requests task assignment
  try {
    await database.exec('ALTER TABLE requests ADD COLUMN assigned_to_id INTEGER REFERENCES roommates(id)');
    console.log('Schema migrated: assigned_to_id added to requests table.');
  } catch (err) {
    // Column already exists, ignore
  }
  
  console.log('Database initialized successfully.');
}
