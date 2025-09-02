import { Router, Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth.js';
import { executeQuery, executeQuerySingle, executeInsert } from '../config/database.js';
import { authenticateToken, requireManager } from './auth.js';

const router = Router();

// Créer une nouvelle commande
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurant_id, items, payment_method, total_amount } = req.body;
    const manager = (req as AuthRequest).user;

    // Vérifier l'accès au restaurant
    if (manager.role === 'manager' && manager.restaurant_id !== restaurant_id) {
      console.log(`AUTH DEBUG - Refusé: manager.restaurant_id=${manager.restaurant_id}, restaurant_id (commande)=${restaurant_id}`);
      return res.status(403).json({ error: `Accès non autorisé à ce restaurant (manager.restaurant_id=${manager.restaurant_id}, restaurant_id=${restaurant_id})` });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Articles de commande requis' });
    }

    // Générer un numéro de commande unique
    const orderNumber = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Créer la commande
    const orderResult = await executeInsert(
      'INSERT INTO orders (restaurant_id, manager_id, order_number, total_amount, payment_method) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, manager.id, orderNumber, total_amount, payment_method]
    );

    const orderId = orderResult.insertId;

    // Traiter chaque article
    for (const item of items) {
      let productId = item.product_id;

      // Si le produit n'existe pas, le créer
      if (!productId) {
        const productResult = await executeInsert(
          'INSERT INTO products (name, type, price, drink_category, restaurant_id) VALUES (?, ?, ?, ?, ?)',
          [item.name, item.type, item.unit_price, item.drink_category || null, restaurant_id]
        );
        productId = productResult.insertId;

        // Créer le stock initial pour les boissons
        if (item.type === 'drink') {
          await executeInsert(
            'INSERT INTO stocks (product_id, quantity, min_threshold) VALUES (?, ?, ?)',
            [productId, 50, 10]
          );
        }
      }

      // Ajouter l'article à la commande
      await executeInsert(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [orderId, productId, item.quantity, item.unit_price, item.total_price]
      );

      // Mettre à jour le stock pour les boissons
      if (item.type === 'drink') {
        const currentStock = await executeQuerySingle(
          'SELECT quantity FROM stocks WHERE product_id = ?',
          [productId]
        );

        if (currentStock) {
          const newQuantity = Math.max(0, currentStock.quantity - item.quantity);
          
          // Mettre à jour le stock
          await executeQuery(
            'UPDATE stocks SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
            [newQuantity, productId]
          );

          // Enregistrer le mouvement de stock
          await executeInsert(
            'INSERT INTO stock_movements (product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_type, reference_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [productId, 'sale', -item.quantity, currentStock.quantity, newQuantity, 'order', orderId, manager.id, `Vente commande ${orderNumber}`]
          );
        }
      }
    }

    res.json({
      message: 'Commande enregistrée avec succès',
      order_id: orderId,
      order_number: orderNumber
    });

  } catch (error) {
    console.error('Erreur création commande:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: 'Erreur lors de la création de la commande', details: error.message });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de la commande', details: error });
    }
  }
});

// Obtenir les commandes d'un restaurant
router.get('/restaurant/:restaurantId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { date, limit = 50 } = req.query;
    const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(restaurantId)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    let whereClause = 'WHERE o.restaurant_id = ?';
    const params = [restaurantId];

    if (date) {
      whereClause += ' AND DATE(o.created_at) = ?';
      params.push(date as string);
    }

    const orders = await executeQuery(`
      SELECT o.*, u.username as manager_name,
             COUNT(oi.id) as items_count,
             GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items_summary
      FROM orders o
      LEFT JOIN users u ON o.manager_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [...params, parseInt(limit as string)]);

    res.json(orders);

  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

// Obtenir les détails d'une commande
router.get('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;

    // Récupérer la commande avec vérification d'accès
    let order;
    if (user.role === 'owner') {
      order = await executeQuerySingle(`
        SELECT o.*, r.name as restaurant_name, u.username as manager_name
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        JOIN users u ON o.manager_id = u.id
        WHERE o.id = ? AND r.owner_id = ?
      `, [id, user.id]);
    } else {
      order = await executeQuerySingle(`
        SELECT o.*, r.name as restaurant_name, u.username as manager_name
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        JOIN users u ON o.manager_id = u.id
        WHERE o.id = ? AND o.restaurant_id = ?
      `, [id, user.restaurant_id]);
    }

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Récupérer les articles de la commande
    const items = await executeQuery(`
      SELECT oi.*, p.name as product_name, p.type as product_type, p.drink_category
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [id]);

    res.json({
      ...order,
      items
    });

  } catch (error) {
    console.error('Erreur récupération commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
});

export default router;
