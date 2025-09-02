import { Router } from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { loginUser } from '../auth.js';

const router = Router();

// Basic authentication endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const result = await loginUser(username, password);
    if (!result) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const { user, token } = result;

    // Check if user type matches
    if (userType && user.role !== userType) {
      return res.status(401).json({ error: 'Type d\'utilisateur incorrect' });
    }

    res.json({
      message: 'Connexion réussie',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Get restaurants for authenticated users
router.get('/restaurants', async (req, res) => {
  try {
    // For now, return sample data
    const restaurants = await dbAll(`
      SELECT r.*, 
             COUNT(DISTINCT u.id) as manager_count,
             COALESCE(daily_stats.revenue, 0) as daily_revenue,
             COALESCE(daily_stats.cash_revenue, 0) as cash_revenue,
             COALESCE(daily_stats.electronic_revenue, 0) as electronic_revenue,
             COALESCE(daily_stats.order_count, 0) as order_count,
             COALESCE(stock_alerts.alert_count, 0) as stock_alerts
      FROM restaurants r
      LEFT JOIN users u ON r.id = u.restaurant_id AND u.role = 'manager'
      LEFT JOIN (
        SELECT o.restaurant_id,
               SUM(o.total_amount) as revenue,
               SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
               SUM(CASE WHEN o.payment_method = 'electronic' THEN o.total_amount ELSE 0 END) as electronic_revenue,
               COUNT(*) as order_count
        FROM orders o
        WHERE DATE(o.created_at) = DATE('now')
        GROUP BY o.restaurant_id
      ) daily_stats ON r.id = daily_stats.restaurant_id
      LEFT JOIN (
        SELECT p.restaurant_id, COUNT(*) as alert_count
        FROM products p
        JOIN stock s ON p.id = s.product_id
        WHERE s.quantity <= s.min_threshold
        GROUP BY p.restaurant_id
      ) stock_alerts ON r.id = stock_alerts.restaurant_id
      WHERE r.owner_id = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [1]); // Default to owner ID 1

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Erreur de récupération des restaurants' });
  }
});

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { restaurant_id, items, payment_method, total_amount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Articles de commande requis' });
    }

    // Create order
    const orderResult = await dbRun(
      "INSERT INTO orders (restaurant_id, manager_id, total_amount, payment_method) VALUES (?, ?, ?, ?)",
      [restaurant_id, 2, total_amount, payment_method] // Default manager ID 2
    );

    const orderId = orderResult.lastID;

    // Process each item
    for (const item of items) {
      // Create product if it doesn't exist
      const productResult = await dbRun(
        "INSERT INTO products (name, type, price, drink_category, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        [item.name, item.type, item.unit_price, item.drink_category || null, restaurant_id]
      );

      const productId = productResult.lastID;

      // Add order item
      await dbRun(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
        [orderId, productId, item.quantity, item.unit_price, item.total_price]
      );

      // Update stock for drinks
      if (item.type === 'drink') {
        // Check if stock exists
        const existingStock = await dbGet(
          "SELECT id FROM stock WHERE product_id = ?",
          [productId]
        );

        if (existingStock) {
          await dbRun(
            "UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?",
            [item.quantity, productId]
          );
        } else {
          // Create initial stock if doesn't exist
          await dbRun(
            "INSERT INTO stock (product_id, quantity, min_threshold) VALUES (?, ?, ?)",
            [productId, 50 - item.quantity, 10]
          );
        }

        // Record stock movement
        await dbRun(
          "INSERT INTO stock_movements (product_id, type, quantity, user_id, notes) VALUES (?, ?, ?, ?, ?)",
          [productId, 'sale', -item.quantity, 2, `Vente commande #${orderId}`]
        );
      }
    }

    res.json({
      message: 'Commande enregistrée avec succès',
      order_id: orderId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Erreur de création de commande' });
  }
});

// Get reports for a restaurant
router.get('/reports/:restaurant_id', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get detailed orders for the date
    const orders = await dbAll(`
      SELECT o.id, o.created_at, o.payment_method, o.total_amount,
             oi.quantity, oi.unit_price, oi.total_price,
             p.name as product_name, p.type as product_type, p.drink_category
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.restaurant_id = ? AND DATE(o.created_at) = ?
      ORDER BY o.created_at ASC
    `, [restaurant_id, date]);

    // Calculate totals
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + order.total_price, 0);

    const electronicTotal = orders
      .filter(order => order.payment_method === 'electronic')
      .reduce((sum, order) => sum + order.total_price, 0);

    res.json({
      date: date,
      restaurant_id: parseInt(restaurant_id),
      orders,
      totals: {
        cash: cashTotal,
        electronic: electronicTotal,
        total: cashTotal + electronicTotal
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Erreur de génération du rapport' });
  }
});

export default router;
