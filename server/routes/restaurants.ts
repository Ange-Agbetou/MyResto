import { Router, Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth.js';
import { executeQuery, executeQuerySingle, executeInsert } from '../config/database.js';
import { authenticateToken, requireOwner, requireManager } from './auth.js';

const router = Router();

// Obtenir la liste des restaurants
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    let restaurants;

    if (user.role === 'owner') {
      // Le propriétaire voit tous ses restaurants avec les statistiques
      restaurants = await executeQuery(`
        SELECT r.*, 
               COUNT(DISTINCT u.id) as manager_count,
               COALESCE(SUM(o.total_amount), 0) as daily_revenue,
               COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END), 0) as cash_revenue,
               COALESCE(SUM(CASE WHEN o.payment_method = 'electronic' THEN o.total_amount ELSE 0 END), 0) as electronic_revenue,
               COUNT(DISTINCT o.id) as order_count,
               COUNT(DISTINCT CASE WHEN s.quantity <= s.min_threshold THEN s.id END) as stock_alerts
        FROM restaurants r
        LEFT JOIN users u ON r.id = u.restaurant_id AND u.role = 'manager'
        LEFT JOIN orders o ON r.id = o.restaurant_id AND DATE(o.created_at) = CURDATE()
        LEFT JOIN products p ON r.id = p.restaurant_id
        LEFT JOIN stocks s ON p.id = s.product_id AND s.quantity <= s.min_threshold
        WHERE r.owner_id = ?
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `, [user.id]);
    } else {
      // Le gérant voit seulement son restaurant
      restaurants = await executeQuery(`
        SELECT r.*,
               COALESCE(SUM(o.total_amount), 0) as daily_revenue,
               COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END), 0) as cash_revenue,
               COALESCE(SUM(CASE WHEN o.payment_method = 'electronic' THEN o.total_amount ELSE 0 END), 0) as electronic_revenue,
               COUNT(DISTINCT o.id) as order_count
        FROM restaurants r
        LEFT JOIN orders o ON r.id = o.restaurant_id AND DATE(o.created_at) = CURDATE()
        WHERE r.id = ?
        GROUP BY r.id
      `, [user.restaurant_id]);
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Erreur récupération restaurants:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des restaurants' });
  }
});

// Créer un nouveau restaurant (propriétaires uniquement)
router.post('/', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { name, location } = req.body;
    const owner = (req as AuthRequest).user;

    if (!name || !location) {
      return res.status(400).json({ error: 'Nom et localisation requis' });
    }

    const result = await executeInsert(
      'INSERT INTO restaurants (name, location, owner_id) VALUES (?, ?, ?)',
      [name, location, owner.id]
    );

    res.json({
      message: 'Restaurant créé avec succès',
      restaurant_id: result.insertId
    });
  } catch (error) {
    console.error('Erreur création restaurant:', error);
    res.status(500).json({ error: 'Erreur lors de la création du restaurant' });
  }
});

// Obtenir les détails d'un restaurant
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;

    // Vérifier l'accès au restaurant
    let restaurant;
    if (user.role === 'owner') {
      restaurant = await executeQuerySingle(
        'SELECT * FROM restaurants WHERE id = ? AND owner_id = ?',
        [id, user.id]
      );
    } else {
      restaurant = await executeQuerySingle(
        'SELECT * FROM restaurants WHERE id = ? AND id = ?',
        [id, user.restaurant_id]
      );
    }

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Erreur récupération restaurant:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du restaurant' });
  }
});

// Obtenir les produits d'un restaurant
// Supprimer un restaurant (propriétaires uniquement)
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;
    // Vérifier que le restaurant appartient au propriétaire
    const restaurant = await executeQuerySingle('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?', [id, user.id]);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant non trouvé ou accès refusé' });
    }
    await executeQuery('DELETE FROM restaurants WHERE id = ?', [id]);
    res.json({ message: 'Restaurant supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression restaurant:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du restaurant' });
  }
});
router.get('/:id/products', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
  const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    const products = await executeQuery(`
      SELECT p.*, 
             COALESCE(s.quantity, 0) as stock_quantity,
             COALESCE(s.min_threshold, 0) as min_threshold,
             CASE WHEN s.quantity <= s.min_threshold THEN 1 ELSE 0 END as low_stock
      FROM products p
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.restaurant_id = ? AND p.is_active = 1
      ORDER BY p.type, p.name
    `, [id]);

    res.json(products);
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

export default router;
