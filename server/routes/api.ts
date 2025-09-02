import { Router } from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticateToken, requireOwner, requireManager, loginUser, hashPassword, AuthRequest } from '../auth.js';

const router = Router();

// Rapport consolidé pour le gérant (par date, limité à son restaurant)
router.get('/reports/consolidated', authenticateToken, requireManager, async (req, res) => {
  try {
    const manager = (req as AuthRequest).user;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    // Commandes du jour pour le restaurant du gérant
    const orders = await dbAll(`
      SELECT o.id, o.order_number, o.total_amount, o.payment_method, o.status, o.created_at,
             GROUP_CONCAT(oi.name) as items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.restaurant_id = ? AND DATE(o.created_at) = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [manager.restaurant_id, date]);

    // Totaux espèces, électroniques, général
    const totals = await dbGet(`
      SELECT 
        SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END) as total_cash,
        SUM(CASE WHEN payment_method='electronic' THEN total_amount ELSE 0 END) as total_electronic,
        SUM(total_amount) as total_general
      FROM orders
      WHERE restaurant_id = ? AND DATE(created_at) = ?
    `, [manager.restaurant_id, date]);

    res.json({ date, orders, totals });
  } catch (error) {
    res.status(500).json({ error: 'Erreur de récupération du rapport consolidé' });
  }
});

// ...existing code...




// ...imports et déclaration du router déjà présents en haut du fichier...


// Suppression d'un gérant (owner uniquement)
router.delete('/users/managers/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const owner = (req as AuthRequest).user;
    const managerId = req.params.id;
    // Vérifie que le manager appartient bien à ce owner
    const manager = await dbGet("SELECT id FROM users WHERE id = ? AND created_by = ?", [managerId, owner!.id]);
    if (!manager) return res.status(404).json({ error: "Gérant non trouvé" });
    await dbRun("DELETE FROM users WHERE id = ?", [managerId]);
    res.json({ message: "Gérant supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// Authentication routes
router.post('/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const result = await loginUser(username, password);
    if (!result) return res.status(401).json({ error: 'Identifiants invalides' });

    const { user, token } = result;

    if (userType && user.role !== userType) {
      return res.status(401).json({ error: 'Type d\'utilisateur incorrect' });
    }

    res.json({ message: 'Connexion réussie', user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Managers management (Owner only)
router.post('/users/managers', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { username, password, restaurant_id } = req.body;
    const owner = (req as AuthRequest).user;
    // Debug logging
    console.log('MANAGER CREATE DEBUG - Authorization:', req.headers['authorization']);
    console.log('MANAGER CREATE DEBUG - Decoded user:', owner);
    if (!owner) {
      console.log('MANAGER CREATE DEBUG - Aucun utilisateur trouvé dans req.user');
    } else {
      console.log(`MANAGER CREATE DEBUG - Utilisateur ID: ${owner.id}, Rôle: ${owner.role}`);
    }

    if (!username || !password || !restaurant_id) {
      return res.status(400).json({ error: 'Nom d\'utilisateur, mot de passe et restaurant requis' });
    }

    const restaurant = await dbGet(
      "SELECT id FROM restaurants WHERE id = ? AND owner_id = ?",
      [restaurant_id, owner!.id]
    );
    console.log('MANAGER CREATE DEBUG - Restaurant:', restaurant);

    if (!restaurant) return res.status(404).json({ error: 'Restaurant non trouvé' });

    const existingUser = await dbGet("SELECT id FROM users WHERE username = ?", [username]);
    console.log('MANAGER CREATE DEBUG - Existing user:', existingUser);
    if (existingUser) return res.status(400).json({ error: 'Nom d\'utilisateur déjà utilisé' });

    const hashedPassword = await hashPassword(password);
    const result = await dbRun(
      "INSERT INTO users (username, password, role, restaurant_id, created_by) VALUES (?, ?, ?, ?, ?)",
      [username, hashedPassword, 'manager', restaurant_id, owner!.id]
    ) as any;
    console.log('MANAGER CREATE DEBUG - Insert result:', result);

    res.json({ message: 'Gérant créé avec succès', manager_id: result.lastID });
  } catch (error) {
    console.error('Create manager error:', error);
    res.status(500).json({ error: 'Erreur de création du gérant' });
  }
});

router.get('/users/managers', authenticateToken, requireOwner, async (req, res) => {
  try {
    const owner = (req as AuthRequest).user;
    // Debug logging
    console.log('MANAGER LIST DEBUG - Authorization:', req.headers['authorization']);
    console.log('MANAGER LIST DEBUG - Decoded user:', owner);

    const managers = await dbAll(`
      SELECT u.id, u.username, u.restaurant_id, r.name as restaurant_name, u.created_at
      FROM users u
      JOIN restaurants r ON u.restaurant_id = r.id
      WHERE u.role = 'manager' AND u.created_by = ?
      ORDER BY u.created_at DESC
    `, [owner!.id]);
    console.log('MANAGER LIST DEBUG - Managers:', managers);

    res.json(managers);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'Erreur de récupération des gérants' });
  }
});

// Restaurants
router.get('/restaurants', authenticateToken, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    let restaurants;

    if (user!.role === 'owner') {
      restaurants = await dbAll(`
        SELECT r.*, 
               COUNT(DISTINCT u.id) as manager_count,
               COALESCE(daily_stats.revenue,0) as daily_revenue,
               COALESCE(daily_stats.cash_revenue,0) as cash_revenue,
               COALESCE(daily_stats.electronic_revenue,0) as electronic_revenue,
               COALESCE(daily_stats.order_count,0) as order_count,
               COALESCE(stock_alerts.alert_count,0) as stock_alerts
        FROM restaurants r
        LEFT JOIN users u ON r.id = u.restaurant_id AND u.role = 'manager'
        LEFT JOIN (
          SELECT o.restaurant_id,
                 SUM(o.total_amount) as revenue,
                 SUM(CASE WHEN o.payment_method='cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
                 SUM(CASE WHEN o.payment_method='electronic' THEN o.total_amount ELSE 0 END) as electronic_revenue,
                 COUNT(*) as order_count
          FROM orders o
          WHERE DATE(o.created_at)=DATE('now')
          GROUP BY o.restaurant_id
        ) daily_stats ON r.id=daily_stats.restaurant_id
        LEFT JOIN (
          SELECT p.restaurant_id, COUNT(*) as alert_count
          FROM products p
          JOIN stock s ON p.id=s.product_id
          WHERE s.quantity <= s.min_threshold
          GROUP BY p.restaurant_id
        ) stock_alerts ON r.id=stock_alerts.restaurant_id
        WHERE r.owner_id=?
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `, [user!.id]);
    } else {
      restaurants = await dbAll(`
        SELECT r.*, 
               COALESCE(daily_stats.revenue,0) as daily_revenue,
               COALESCE(daily_stats.cash_revenue,0) as cash_revenue,
               COALESCE(daily_stats.electronic_revenue,0) as electronic_revenue,
               COALESCE(daily_stats.order_count,0) as order_count
        FROM restaurants r
        LEFT JOIN (
          SELECT o.restaurant_id,
                 SUM(o.total_amount) as revenue,
                 SUM(CASE WHEN o.payment_method='cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
                 SUM(CASE WHEN o.payment_method='electronic' THEN o.total_amount ELSE 0 END) as electronic_revenue,
                 COUNT(*) as order_count
          FROM orders o
          WHERE DATE(o.created_at)=DATE('now')
          GROUP BY o.restaurant_id
        ) daily_stats ON r.id=daily_stats.restaurant_id
        WHERE r.id=?
      `, [user!.restaurant_id]);
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Erreur de récupération des restaurants' });
  }
});

// Products
router.post('/products', authenticateToken, requireManager, async (req,res)=>{
  try{
    const user = (req as AuthRequest).user;
    const {restaurant_id, name, type, price, drink_category} = req.body;

    if(user!.role==='manager' && Number(user!.restaurant_id)!==Number(restaurant_id))
      return res.status(403).json({error:'Accès non autorisé à ce restaurant'});

    if(!restaurant_id||!name||!type||!price)
      return res.status(400).json({error:'Restaurant, nom, type et prix requis'});

    const result = await dbRun(
      "INSERT INTO products (name,type,price,drink_category,restaurant_id) VALUES (?,?,?,?,?)",
      [name,type,price,drink_category||null,restaurant_id]
    ) as any;

    if(type==='drink'){
      await dbRun("INSERT INTO stock (product_id,quantity,min_threshold) VALUES (?,?,?)",[result.lastID,0,10]);
    }

    res.json({message:'Produit créé avec succès',product_id:result.lastID});
  }catch(error){
    console.error('Create product error:',error);
    res.status(500).json({error:'Erreur de création du produit'});
  }
});

router.get('/products/:restaurant_id', authenticateToken, requireManager, async (req,res)=>{
  try{
    const {restaurant_id} = req.params;
    const user = (req as AuthRequest).user;

    if(user!.role==='manager' && user!.restaurant_id!==parseInt(restaurant_id))
      return res.status(403).json({error:'Accès non autorisé à ce restaurant'});

    const products = await dbAll(`
      SELECT p.*, 
             COALESCE(s.quantity,0) as stock_quantity,
             COALESCE(s.min_threshold,0) as min_threshold,
             CASE WHEN s.quantity<=s.min_threshold THEN 1 ELSE 0 END as low_stock
      FROM products p
      LEFT JOIN stock s ON p.id=s.product_id
      WHERE p.restaurant_id=?
      ORDER BY p.type,p.name
    `,[restaurant_id]);

    res.json(products);
  }catch(error){
    console.error('Get products error:',error);
    res.status(500).json({error:'Erreur de récupération des produits'});
  }
});

// Orders
router.post('/orders', authenticateToken, requireManager, async (req,res)=>{
  try{
    const {restaurant_id,items,payment_method,total_amount}=req.body;
    const manager = (req as AuthRequest).user;

    if(manager!.role==='manager' && manager!.restaurant_id!==restaurant_id)
      return res.status(403).json({error:'Accès non autorisé à ce restaurant'});

    if(!items||!Array.isArray(items)||items.length===0)
      return res.status(400).json({error:'Articles de commande requis'});

    const orderResult = await dbRun(
      "INSERT INTO orders (restaurant_id,manager_id,total_amount,payment_method) VALUES (?,?,?,?)",
      [restaurant_id,manager!.id,total_amount,payment_method]
    ) as any;
    const orderId = orderResult.lastID;

    for(const item of items){
      const {product_id, quantity, unit_price, total_price} = item;
      await dbRun("INSERT INTO order_items (order_id,product_id,quantity,unit_price,total_price) VALUES (?,?,?,?,?)",
        [orderId,product_id,quantity,unit_price,total_price]
      );

      const product = await dbGet("SELECT type FROM products WHERE id=?",[product_id]) as any;
      if(product && product.type==='drink'){
        await dbRun("UPDATE stock SET quantity=quantity-?, updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[quantity,product_id]);
        await dbRun("INSERT INTO stock_movements (product_id,type,quantity,user_id,notes) VALUES (?,?,?,?,?)",
          [product_id,'sale',-quantity,manager!.id,`Vente commande #${orderId}`]
        );
      }
    }

    res.json({message:'Commande enregistrée avec succès', order_id:orderId});
  }catch(error){
    console.error('Create order error:',error);
    res.status(500).json({error:'Erreur de création de commande'});
  }
});

// Stock
router.post('/stock/restock', authenticateToken, requireOwner, async(req,res)=>{
  try{
    const {product_id,quantity,notes}=req.body;
    const owner = (req as AuthRequest).user;
    if(!product_id||!quantity||quantity<=0) return res.status(400).json({error:'Produit et quantité valides requis'});

    const product = await dbGet(`
      SELECT p.id,r.owner_id 
      FROM products p
      JOIN restaurants r ON p.restaurant_id=r.id
      WHERE p.id=? AND r.owner_id=?
    `,[product_id,owner!.id]);

    if(!product) return res.status(404).json({error:'Produit non trouvé'});

    const existingStock = await dbGet("SELECT id FROM stock WHERE product_id=?",[product_id]);
    if(existingStock){
      await dbRun("UPDATE stock SET quantity=quantity+?,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",[quantity,product_id]);
    } else {
      await dbRun("INSERT INTO stock (product_id,quantity) VALUES (?,?)",[product_id,quantity]);
    }

    await dbRun("INSERT INTO stock_movements (product_id,type,quantity,user_id,notes) VALUES (?,?,?,?,?)",
      [product_id,'restock',quantity,owner!.id,notes||'Ravitaillement']);

    res.json({message:'Stock mis à jour avec succès'});
  }catch(error){
    console.error('Restock error:',error);
    res.status(500).json({error:'Erreur de mise à jour du stock'});
  }
});

export default router;
