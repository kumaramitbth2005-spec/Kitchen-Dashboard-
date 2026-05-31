import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initDb, getDb } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bachelor_room_super_secret_key_12345';

app.use(cors());
app.use(express.json());

// Initialize database
await initDb();

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ----------------- AUTH ROUTES -----------------

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM roommates WHERE username = ?', [username.toLowerCase().trim()]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current roommate profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, name, username, avatar_url FROM roommates WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Roommate not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update roommate profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, password, avatar_url } = req.body;
  try {
    const db = await getDb();
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await db.run(
        'UPDATE roommates SET name = ?, password_hash = ?, avatar_url = ? WHERE id = ?',
        [name, hash, avatar_url || '', req.user.id]
      );
    } else {
      await db.run(
        'UPDATE roommates SET name = ?, avatar_url = ? WHERE id = ?',
        [name, avatar_url || '', req.user.id]
      );
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- ROOMMATE & FINANCIAL CALCULATIONS -----------------

// Get roommates summary
app.get('/api/roommates', async (req, res) => {
  try {
    const db = await getDb();
    
    // Fetch all roommates
    const roommates = await db.all('SELECT id, name, username, avatar_url FROM roommates');
    
    // Fetch total direct contributions per roommate
    const contributions = await db.all(
      'SELECT contributor_id, SUM(amount) as total FROM contributions GROUP BY contributor_id'
    );
    
    // Fetch out-of-pocket expenses per roommate (this counts as a form of contribution)
    const outOfPocketExpenses = await db.all(
      "SELECT purchased_by_id, SUM(amount_spent) as total FROM expenses WHERE payment_method = 'out_of_pocket' GROUP BY purchased_by_id"
    );
    
    // Fetch total expenses made by each roommate (regardless of payment method)
    const totalExpensesMade = await db.all(
      'SELECT purchased_by_id, SUM(amount_spent) as total FROM expenses GROUP BY purchased_by_id'
    );

    // Sum total spent by the room (for sharing calculation)
    const totalSpentResult = await db.get('SELECT SUM(amount_spent) as total FROM expenses');
    const totalSpent = totalSpentResult.total || 0;
    
    // Fair share is split equally among the 5 roommates
    const numRoommates = roommates.length || 5;
    const fairShare = totalSpent / numRoommates;

    // Create maps for quick lookup
    const contribMap = {};
    const oopMap = {};
    const expMadeMap = {};
    
    contributions.forEach(c => { contribMap[c.contributor_id] = c.total; });
    outOfPocketExpenses.forEach(e => { oopMap[e.purchased_by_id] = e.total; });
    totalExpensesMade.forEach(e => { expMadeMap[e.purchased_by_id] = e.total; });

    // Build roommate stats
    const roommateStats = roommates.map(rm => {
      const directContribution = contribMap[rm.id] || 0;
      const outOfPocket = oopMap[rm.id] || 0;
      
      // Total contribution is direct cash pool contributions + out of pocket purchases
      const totalContribution = directContribution + outOfPocket;
      const expensesMade = expMadeMap[rm.id] || 0;
      
      // Net Balance = (what they put in) - (their fair share of the room's total expenses)
      const balance = totalContribution - fairShare;

      return {
        id: rm.id,
        name: rm.name,
        username: rm.username,
        avatar_url: rm.avatar_url,
        total_contribution: totalContribution,
        total_expenses_made: expensesMade,
        balance: parseFloat(balance.toFixed(2))
      };
    });

    res.json(roommateStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- EXPENSE ENDPOINTS -----------------

// List expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const db = await getDb();
    const expenses = await db.all(`
      SELECT expenses.*, roommates.name as purchased_by_name, roommates.avatar_url as purchaser_avatar
      FROM expenses
      JOIN roommates ON expenses.purchased_by_id = roommates.id
      ORDER BY expenses.created_at DESC
    `);
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { product_name, quantity, unit, amount_spent, category, payment_method, notes, update_inventory } = req.body;
  
  if (!product_name || !quantity || !unit || !amount_spent || !category) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    
    // Insert expense
    const result = await db.run(`
      INSERT INTO expenses (product_name, quantity, unit, amount_spent, purchased_by_id, category, payment_method, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product_name,
      quantity,
      unit,
      amount_spent,
      req.user.id,
      category,
      payment_method || 'common_fund',
      notes || '',
      timestamp
    ]);

    // Check if we should update inventory automatically
    if (update_inventory) {
      // Find matching item in inventory by name (case-insensitive)
      const item = await db.get('SELECT * FROM inventory WHERE LOWER(item_name) = ?', [product_name.toLowerCase().trim()]);
      if (item) {
        const newQty = item.quantity_available + parseFloat(quantity);
        await db.run('UPDATE inventory SET quantity_available = ? WHERE id = ?', [newQty, item.id]);
        
        // Remove from pending requests if exists
        await db.run(
          "UPDATE requests SET completed = 1, completed_by_id = ?, completed_at = ? WHERE LOWER(item_name) = ? AND completed = 0",
          [req.user.id, timestamp, product_name.toLowerCase().trim()]
        );
      }
    }

    res.status(201).json({ id: result.lastID, created_at: timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Update an expense
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { product_name, quantity, unit, amount_spent, purchased_by_id, category, payment_method, notes } = req.body;

  if (!product_name || quantity === undefined || !unit || amount_spent === undefined || !category || !purchased_by_id) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  try {
    const db = await getDb();
    const oldExpense = await db.get('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!oldExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Update expense record
    await db.run(`
      UPDATE expenses 
      SET product_name = ?, quantity = ?, unit = ?, amount_spent = ?, purchased_by_id = ?, category = ?, payment_method = ?, notes = ?
      WHERE id = ?
    `, [
      product_name,
      parseFloat(quantity),
      unit,
      parseFloat(amount_spent),
      parseInt(purchased_by_id),
      category,
      payment_method || 'common_fund',
      notes || '',
      id
    ]);

    // Simple inventory correction if product name is similar
    const invItem = await db.get('SELECT * FROM inventory WHERE LOWER(item_name) = ?', [product_name.toLowerCase().trim()]);
    if (invItem) {
      const qtyDiff = parseFloat(quantity) - oldExpense.quantity;
      if (qtyDiff !== 0) {
        const newQty = invItem.quantity_available + qtyDiff;
        await db.run('UPDATE inventory SET quantity_available = ? WHERE id = ?', [newQty, invItem.id]);
      }
    }

    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const expense = await db.get('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Delete record
    await db.run('DELETE FROM expenses WHERE id = ?', [id]);

    // Reverse inventory addition if it was added
    const invItem = await db.get('SELECT * FROM inventory WHERE LOWER(item_name) = ?', [expense.product_name.toLowerCase().trim()]);
    if (invItem) {
      const newQty = Math.max(0, invItem.quantity_available - expense.quantity);
      await db.run('UPDATE inventory SET quantity_available = ? WHERE id = ?', [newQty, invItem.id]);
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- CONTRIBUTION ENDPOINTS -----------------

// List contributions
app.get('/api/contributions', async (req, res) => {
  try {
    const db = await getDb();
    const contributions = await db.all(`
      SELECT contributions.*, roommates.name as contributor_name, roommates.avatar_url as contributor_avatar
      FROM contributions
      JOIN roommates ON contributions.contributor_id = roommates.id
      ORDER BY contributions.created_at DESC
    `);
    res.json(contributions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a contribution
app.post('/api/contributions', authenticateToken, async (req, res) => {
  const { amount, contributor_id } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  // Contributor defaults to logged-in user if not specified
  const contributor = contributor_id || req.user.id;

  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    
    const result = await db.run(`
      INSERT INTO contributions (contributor_id, amount, created_at)
      VALUES (?, ?, ?)
    `, [contributor, amount, timestamp]);
    
    res.status(201).json({ id: result.lastID, created_at: timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- INVENTORY ENDPOINTS -----------------

// Get all inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const db = await getDb();
    const inventory = await db.all('SELECT * FROM inventory ORDER BY category, item_name');
    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stock manually
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  const { quantity_available, min_stock_level } = req.body;
  const { id } = req.params;

  if (quantity_available === undefined && min_stock_level === undefined) {
    return res.status(400).json({ error: 'Quantity or minimum stock level required' });
  }

  try {
    const db = await getDb();
    const item = await db.get('SELECT * FROM inventory WHERE id = ?', [id]);
    
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newQty = quantity_available !== undefined ? parseFloat(quantity_available) : item.quantity_available;
    const newMin = min_stock_level !== undefined ? parseFloat(min_stock_level) : item.min_stock_level;

    await db.run(
      'UPDATE inventory SET quantity_available = ?, min_stock_level = ? WHERE id = ?',
      [newQty, newMin, id]
    );

    // If new quantity falls below minimum stock level, automatically add a request
    if (newQty < newMin) {
      // Check if there is already an active (uncompleted) request for this item
      const activeRequest = await db.get(
        'SELECT * FROM requests WHERE LOWER(item_name) = ? AND completed = 0',
        [item.item_name.toLowerCase()]
      );
      
      if (!activeRequest) {
        const timestamp = new Date().toISOString();
        // System requested (assigned to roommate 1 or the updater)
        await db.run(`
          INSERT INTO requests (item_name, quantity, unit, requested_by_id, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          item.item_name,
          parseFloat((newMin - newQty).toFixed(2)),
          item.unit,
          req.user.id,
          timestamp
        ]);
      }
    }

    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- REQUEST BOARD & SHOPPING TASK SYSTEM -----------------

// List requests
app.get('/api/requests', async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all(`
      SELECT requests.*, rm_req.name as requested_by_name, rm_comp.name as completed_by_name, rm_assign.name as assigned_to_name
      FROM requests
      JOIN roommates rm_req ON requests.requested_by_id = rm_req.id
      LEFT JOIN roommates rm_comp ON requests.completed_by_id = rm_comp.id
      LEFT JOIN roommates rm_assign ON requests.assigned_to_id = rm_assign.id
      ORDER BY requests.completed ASC, requests.created_at DESC
    `);
    
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign/Claim a request
app.put('/api/requests/:id/assign', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { assigned_to_id } = req.body;

  try {
    const db = await getDb();
    const request = await db.get('SELECT * FROM requests WHERE id = ?', [id]);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.completed === 1) {
      return res.status(400).json({ error: 'Cannot assign a completed request' });
    }

    // Update assignment
    await db.run('UPDATE requests SET assigned_to_id = ? WHERE id = ?', [assigned_to_id || null, id]);
    
    res.json({ message: 'Request assignment updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a request
app.post('/api/requests', authenticateToken, async (req, res) => {
  const { item_name, quantity, unit } = req.body;
  if (!item_name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    
    const result = await db.run(`
      INSERT INTO requests (item_name, quantity, unit, requested_by_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      item_name,
      quantity ? parseFloat(quantity) : null,
      unit || '',
      req.user.id,
      timestamp
    ]);
    
    res.status(201).json({ id: result.lastID, created_at: timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark request as completed (Purchasing via Shopping System)
app.put('/api/requests/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount_spent, payment_method, quantity_purchased, notes } = req.body;
  
  if (amount_spent === undefined) {
    return res.status(400).json({ error: 'Amount spent is required to check out items' });
  }

  try {
    const db = await getDb();
    const request = await db.get('SELECT * FROM requests WHERE id = ?', [id]);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.completed === 1) {
      return res.status(400).json({ error: 'Request already completed' });
    }

    const timestamp = new Date().toISOString();
    const finalQty = quantity_purchased ? parseFloat(quantity_purchased) : (request.quantity || 1);
    const finalUnit = request.unit || 'packets';
    
    // Find category for the item if it exists in inventory
    const invItem = await db.get('SELECT * FROM inventory WHERE LOWER(item_name) = ?', [request.item_name.toLowerCase().trim()]);
    const category = invItem ? invItem.category : 'Oils & Others';

    // 1. Mark request as completed
    await db.run(`
      UPDATE requests 
      SET completed = 1, completed_by_id = ?, completed_at = ?, is_read = 0
      WHERE id = ?
    `, [req.user.id, timestamp, id]);

    // 2. Add an expense automatically
    await db.run(`
      INSERT INTO expenses (product_name, quantity, unit, amount_spent, purchased_by_id, category, payment_method, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      request.item_name,
      finalQty,
      finalUnit,
      parseFloat(amount_spent),
      req.user.id,
      category,
      payment_method || 'common_fund',
      notes || `Purchased from request board`,
      timestamp
    ]);

    // 3. Update inventory automatically
    if (invItem) {
      const newQty = invItem.quantity_available + finalQty;
      await db.run('UPDATE inventory SET quantity_available = ? WHERE id = ?', [newQty, invItem.id]);
    }

    res.json({ message: 'Request checked out and inventory updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark unread completed requests as read
app.post('/api/requests/mark-read', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE requests SET is_read = 1 WHERE completed = 1 AND is_read = 0');
    res.json({ message: 'Marked all completed notifications as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------- DASHBOARD & REPORTS ENDPOINTS -----------------

// Get Dashboard Info
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    
    // 1. Total Fund details
    const contributions = await db.all('SELECT SUM(amount) as total FROM contributions');
    const directContrib = contributions[0]?.total || 0;
    
    const oopExpenses = await db.all("SELECT SUM(amount_spent) as total FROM expenses WHERE payment_method = 'out_of_pocket'");
    const totalOop = oopExpenses[0]?.total || 0;
    
    const allExpenses = await db.all('SELECT SUM(amount_spent) as total FROM expenses');
    const totalSpent = allExpenses[0]?.total || 0;
    
    const cfExpenses = await db.all("SELECT SUM(amount_spent) as total FROM expenses WHERE payment_method = 'common_fund'");
    const totalCfSpent = cfExpenses[0]?.total || 0;

    // Remaining common fund balance (cash on hand)
    const roomBalance = directContrib - totalCfSpent;

    // 2. Monthly Expenses
    const currentYearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlySpendResult = await db.get(
      "SELECT SUM(amount_spent) as total FROM expenses WHERE strftime('%Y-%m', created_at) = ?",
      [currentYearMonth]
    );
    const monthlyExpenses = monthlySpendResult.total || 0;

    // 3. Top Contributor
    // Need to aggregate direct contributions + out-of-pocket expenses per roommate
    const roommates = await db.all('SELECT id, name FROM roommates');
    const contribs = await db.all('SELECT contributor_id, SUM(amount) as total FROM contributions GROUP BY contributor_id');
    const oops = await db.all("SELECT purchased_by_id, SUM(amount_spent) as total FROM expenses WHERE payment_method = 'out_of_pocket' GROUP BY purchased_by_id");
    
    const cMap = {};
    const oMap = {};
    contribs.forEach(c => { cMap[c.contributor_id] = c.total; });
    oops.forEach(o => { oMap[o.purchased_by_id] = o.total; });
    
    let topContributorName = 'N/A';
    let maxContribution = 0;
    
    roommates.forEach(r => {
      const total = (cMap[r.id] || 0) + (oMap[r.id] || 0);
      if (total > maxContribution) {
        maxContribution = total;
        topContributorName = r.name;
      }
    });

    // 4. Pending purchase requests
    const pendingCountResult = await db.get('SELECT COUNT(*) as count FROM requests WHERE completed = 0');
    const pendingRequests = pendingCountResult.count || 0;

    // 5. Low Stock items
    const lowStockResult = await db.get('SELECT COUNT(*) as count FROM inventory WHERE quantity_available < min_stock_level');
    const lowStockItems = lowStockResult.count || 0;

    // 6. Recent Transactions (merged and sorted list of contributions and expenses)
    const recentExpenses = await db.all(`
      SELECT 'expense' as type, expenses.id, product_name as title, amount_spent as amount, created_at, roommates.name as person
      FROM expenses
      JOIN roommates ON expenses.purchased_by_id = roommates.id
      ORDER BY created_at DESC LIMIT 5
    `);
    
    const recentContributions = await db.all(`
      SELECT 'contribution' as type, contributions.id, 'Fund Contribution' as title, amount, created_at, roommates.name as person
      FROM contributions
      JOIN roommates ON contributions.contributor_id = roommates.id
      ORDER BY created_at DESC LIMIT 5
    `);

    const recentTransactions = [...recentExpenses, ...recentContributions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);

    // 7. Inventory status
    const totalItemsResult = await db.get('SELECT COUNT(*) as count FROM inventory');
    const totalItems = totalItemsResult.count || 0;
    const okItems = totalItems - lowStockItems;

    res.json({
      room_balance: parseFloat(roomBalance.toFixed(2)),
      monthly_expenses: parseFloat(monthlyExpenses.toFixed(2)),
      total_spent: parseFloat(totalSpent.toFixed(2)),
      top_contributor: topContributorName,
      pending_requests: pendingRequests,
      low_stock_items: lowStockItems,
      recent_transactions: recentTransactions,
      inventory_status: {
        total: totalItems,
        low_stock: lowStockItems,
        ok: okItems
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics & Reports
app.get('/api/reports', async (req, res) => {
  try {
    const db = await getDb();
    
    // 1. Monthly expense breakdown (last 6 months)
    const monthlyExpenses = await db.all(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount_spent) as amount
      FROM expenses
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);
    
    // 2. Spending by category
    const categorySpending = await db.all(`
      SELECT category, SUM(amount_spent) as amount
      FROM expenses
      GROUP BY category
    `);

    // 3. Contribution Report
    const roommates = await db.all('SELECT id, name FROM roommates');
    const contributions = await db.all('SELECT contributor_id, SUM(amount) as total FROM contributions GROUP BY contributor_id');
    const outOfPocket = await db.all("SELECT purchased_by_id, SUM(amount_spent) as total FROM expenses WHERE payment_method = 'out_of_pocket' GROUP BY purchased_by_id");
    
    const contribMap = {};
    const oopMap = {};
    contributions.forEach(c => { contribMap[c.contributor_id] = c.total; });
    outOfPocket.forEach(o => { oopMap[o.purchased_by_id] = o.total; });

    const contributionReport = roommates.map(rm => {
      const direct = contribMap[rm.id] || 0;
      const oop = oopMap[rm.id] || 0;
      return {
        name: rm.name,
        direct,
        out_of_pocket: oop,
        total: direct + oop
      };
    });

    // 4. Grocery Consumption Report
    const groceryStock = await db.all(`
      SELECT item_name as name, quantity_available as value, min_stock_level as minStock, unit
      FROM inventory
      ORDER BY category, item_name
    `);

    res.json({
      monthly_expenses: monthlyExpenses.reverse(),
      category_spending: categorySpending,
      contribution_report: contributionReport,
      grocery_stock: groceryStock
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
