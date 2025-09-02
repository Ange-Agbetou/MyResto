import { Router } from 'express';
import { AuthRequest } from '../auth.js';
import { executeQuery, executeQuerySingle, executeInsert } from '../config/database.js';
import { authenticateToken, requireOwner, requireManager } from './auth.js';

const router = Router();

// Obtenir l'état des stocks d'un restaurant
router.get('/restaurant/:restaurantId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurantId } = req.params;
  const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(restaurantId)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    const stocks = await executeQuery(`
      SELECT p.id as product_id, p.name, p.type, p.drink_category,
             s.quantity, s.min_threshold, s.max_threshold,
             CASE WHEN s.quantity <= s.min_threshold THEN 1 ELSE 0 END as is_low_stock,
             s.updated_at as last_updated
      FROM products p
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.restaurant_id = ? AND p.is_active = 1
      ORDER BY is_low_stock DESC, p.type, p.name
    `, [restaurantId]);

    res.json(stocks);

  } catch (error) {
    console.error('Erreur récupération stocks:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stocks' });
  }
});

// Ravitailler un produit (propriétaires uniquement)
router.post('/restock', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { product_id, quantity, notes, unit_cost } = req.body;
  const owner = (req as AuthRequest).user;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'ID produit et quantité valides requis' });
    }

    // Vérifier que le produit appartient à un restaurant du propriétaire
    const product = await executeQuerySingle(`
      SELECT p.id, p.name, r.owner_id, s.quantity as current_quantity
      FROM products p
      JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.id = ? AND r.owner_id = ?
    `, [product_id, owner.id]);

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const currentQuantity = product.current_quantity || 0;
    const newQuantity = currentQuantity + quantity;

    // Mettre à jour ou créer le stock
    const existingStock = await executeQuerySingle(
      'SELECT id FROM stocks WHERE product_id = ?',
      [product_id]
    );

    if (existingStock) {
      await executeQuery(
        'UPDATE stocks SET quantity = ?, unit_cost = COALESCE(?, unit_cost), updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [newQuantity, unit_cost, product_id]
      );
    } else {
      await executeInsert(
        'INSERT INTO stocks (product_id, quantity, unit_cost, min_threshold) VALUES (?, ?, ?, ?)',
        [product_id, newQuantity, unit_cost || 0, 10]
      );
    }

    // Enregistrer le mouvement de stock
    await executeInsert(
      'INSERT INTO stock_movements (product_id, movement_type, quantity_change, quantity_before, quantity_after, unit_cost, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [product_id, 'restock', quantity, currentQuantity, newQuantity, unit_cost || 0, owner.id, notes || `Ravitaillement de ${product.name}`]
    );

    res.json({
      message: 'Stock mis à jour avec succès',
      product_name: product.name,
      previous_quantity: currentQuantity,
      new_quantity: newQuantity,
      added_quantity: quantity
    });

  } catch (error) {
    console.error('Erreur ravitaillement:', error);
    res.status(500).json({ error: 'Erreur lors du ravitaillement' });
  }
});

// Ajuster le stock manuellement
router.post('/adjust', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { product_id, new_quantity, reason, notes } = req.body;
  const owner = (req as AuthRequest).user;

    if (!product_id || new_quantity < 0) {
      return res.status(400).json({ error: 'ID produit et quantité valides requis' });
    }

    // Vérifier le produit
    const product = await executeQuerySingle(`
      SELECT p.id, p.name, r.owner_id, s.quantity as current_quantity
      FROM products p
      JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.id = ? AND r.owner_id = ?
    `, [product_id, owner.id]);

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const currentQuantity = product.current_quantity || 0;
    const quantityChange = new_quantity - currentQuantity;

    // Mettre à jour le stock
    const existingStock = await executeQuerySingle(
      'SELECT id FROM stocks WHERE product_id = ?',
      [product_id]
    );

    if (existingStock) {
      await executeQuery(
        'UPDATE stocks SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [new_quantity, product_id]
      );
    } else {
      await executeInsert(
        'INSERT INTO stocks (product_id, quantity, min_threshold) VALUES (?, ?, ?)',
        [product_id, new_quantity, 10]
      );
    }

    // Enregistrer le mouvement
    await executeInsert(
      'INSERT INTO stock_movements (product_id, movement_type, quantity_change, quantity_before, quantity_after, user_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product_id, 'adjustment', quantityChange, currentQuantity, new_quantity, owner.id, notes || `Ajustement: ${reason || 'Non spécifié'}`]
    );

    res.json({
      message: 'Stock ajusté avec succès',
      product_name: product.name,
      previous_quantity: currentQuantity,
      new_quantity: new_quantity,
      change: quantityChange
    });

  } catch (error) {
    console.error('Erreur ajustement stock:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajustement du stock' });
  }
});

// Obtenir l'historique des mouvements de stock
router.get('/movements/:productId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20 } = req.query;
  const user = (req as AuthRequest).user;

    // Vérifier l'accès au produit
    let whereClause = '';
    let params = [productId];

    if (user.role === 'manager') {
      whereClause = ' AND r.id = ?';
  params.push(String(user.restaurant_id));
    } else {
      whereClause = ' AND r.owner_id = ?';
  params.push(String(user.id));
    }

    const movements = await executeQuery(`
      SELECT sm.*, p.name as product_name, u.username,
             CASE 
               WHEN sm.movement_type = 'sale' THEN 'Vente'
               WHEN sm.movement_type = 'restock' THEN 'Ravitaillement'
               WHEN sm.movement_type = 'adjustment' THEN 'Ajustement'
               WHEN sm.movement_type = 'waste' THEN 'Perte'
               ELSE sm.movement_type
             END as movement_type_label
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN restaurants r ON p.restaurant_id = r.id
      JOIN users u ON sm.user_id = u.id
      WHERE sm.product_id = ? ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT ?
    `, [...params, parseInt(limit as string)]);

    res.json(movements);

  } catch (error) {
    console.error('Erreur historique mouvements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// Obtenir les alertes de stock bas
router.get('/alerts/:restaurantId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurantId } = req.params;
  const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(restaurantId)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    const alerts = await executeQuery(`
      SELECT p.id, p.name, p.type, p.drink_category,
             s.quantity, s.min_threshold,
             ROUND((s.quantity / s.min_threshold) * 100, 1) as stock_percentage
      FROM products p
      JOIN stocks s ON p.id = s.product_id
      WHERE p.restaurant_id = ? 
        AND p.is_active = 1 
        AND s.quantity <= s.min_threshold
      ORDER BY stock_percentage ASC, p.name
    `, [restaurantId]);

    res.json(alerts);

  } catch (error) {
    console.error('Erreur alertes stock:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
});

export default router;
