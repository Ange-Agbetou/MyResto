import { Router, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery, executeQuerySingle, executeInsert } from '../config/database.js';

const router = Router();

interface User {
  id: number;
  username: string;
  password: string;
  role: 'owner' | 'manager';
  restaurant_id?: number;
}

// Étend le type Request pour inclure la propriété user
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Générer un token JWT
const generateToken = (user: Omit<User, 'password'>): string => {
  const secret = process.env.JWT_SECRET || 'restaurant-pro-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      restaurant_id: user.restaurant_id
    },
    secret,
    { expiresIn }
  );
};

// Middleware d'authentification
export const authenticateToken = async (req: AuthenticatedRequest, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log('AUTH DEBUG - Authorization header:', authHeader);
  console.log('AUTH DEBUG - Token reçu:', token);

  if (!token) {
    console.log('AUTH DEBUG - Aucun token reçu');
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'restaurant-pro-secret';
    const decoded = jwt.verify(token, secret);
    console.log('AUTH DEBUG - Token décodé:', decoded);
    // Vérifier que l'utilisateur existe toujours
    const user = await executeQuerySingle(
      'SELECT id, username, role, restaurant_id FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      console.log('AUTH DEBUG - Utilisateur non trouvé en base');
      return res.status(403).json({ error: 'Utilisateur non trouvé' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('AUTH DEBUG - Erreur vérification token:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware pour propriétaires uniquement
export const requireOwner = (req: AuthenticatedRequest, res: any, next: any) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Accès propriétaire requis' });
  }
  next();
};

// Middleware pour gérants (inclut propriétaires)
export const requireManager = (req: AuthenticatedRequest, res: any, next: any) => {
  if (!req.user) {
    console.log('AUTH DEBUG - Aucun utilisateur dans la requête');
    return res.status(403).json({ error: 'Accès gérant requis' });
  }
  console.log('AUTH DEBUG - Rôle utilisateur:', req.user.role);
  if (!['owner', 'manager'].includes(req.user.role)) {
    console.log('AUTH DEBUG - Rôle non autorisé:', req.user.role);
    return res.status(403).json({ error: 'Accès gérant requis' });
  }
  next();
};

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;
    console.log('LOGIN DEBUG - username:', username, '| password:', password, '| userType:', userType);

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }

    // Rechercher l'utilisateur
    const user = await executeQuerySingle(
      'SELECT id, username, password, role, restaurant_id FROM users WHERE username = ?',
      [username]
    ) as User;
    console.log('LOGIN DEBUG - user from DB:', user);

    if (!user) {
      console.log('LOGIN DEBUG - user not found');
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('LOGIN DEBUG - isPasswordValid:', isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Vérifier le type d'utilisateur si spécifié
    if (userType && user.role !== userType) {
      console.log('LOGIN DEBUG - userType mismatch:', userType, user.role);
      return res.status(401).json({ 
        error: 'Type d\'utilisateur incorrect' 
      });
    }

    // Générer le token
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      role: user.role,
      restaurant_id: user.restaurant_id
    };

    const token = generateToken(userWithoutPassword);

    // Enregistrer la session (optionnel)
    try {
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24h d'expiration

      await executeInsert(
        'INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [user.id, tokenHash, expiresAt, req.ip, req.get('User-Agent')]
      );
    } catch (sessionError) {
      console.warn('Avertissement: impossible d\'enregistrer la session:', sessionError);
      // Continue même si l'enregistrement de session échoue
    }

    res.json({
      message: 'Connexion réussie',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Route de déconnexion
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      
      // Supprimer la session
      await executeQuery(
        'DELETE FROM user_sessions WHERE token_hash = ?',
        [tokenHash]
      );
    }

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    res.status(500).json({ error: 'Erreur de déconnexion' });
  }
});

// Route pour vérifier le token
router.get('/verify', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Route pour créer un gérant (propriétaires uniquement)
router.post('/create-manager', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, restaurant_id } = req.body;
    const owner = req.user;

    if (!username || !password || !restaurant_id) {
      return res.status(400).json({ 
        error: 'Nom d\'utilisateur, mot de passe et restaurant requis' 
      });
    }

    // Vérifier que le restaurant appartient au propriétaire
    const restaurant = await executeQuerySingle(
      'SELECT id FROM restaurants WHERE id = ? AND owner_id = ?',
      [restaurant_id, owner.id]
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    // Vérifier que le nom d'utilisateur n'existe pas
    const existingUser = await executeQuerySingle(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Ce nom d\'utilisateur est déjà utilisé' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le gérant
    const result = await executeInsert(
      'INSERT INTO users (username, password, role, restaurant_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, 'manager', restaurant_id, owner.id]
    );

    res.json({
      message: 'Gérant créé avec succès',
      manager_id: result.insertId
    });

  } catch (error) {
    console.error('Erreur création gérant:', error);
    res.status(500).json({ error: 'Erreur lors de la création du gérant' });
  }
});

// Route pour lister les gérants (propriétaires uniquement)
router.get('/managers', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const owner = req.user;

    const managers = await executeQuery(`
      SELECT u.id, u.username, u.restaurant_id, u.created_at,
             r.name as restaurant_name, r.location as restaurant_location
      FROM users u
      LEFT JOIN restaurants r ON u.restaurant_id = r.id
      WHERE u.role = 'manager' AND u.created_by = ?
      ORDER BY u.created_at DESC
    `, [owner.id]);

    res.json(managers);

  } catch (error) {
    console.error('Erreur récupération gérants:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des gérants' });
  }
});

// Route pour changer de mot de passe
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }

    // Récupérer le mot de passe actuel
    const dbUser = await executeQuerySingle(
      'SELECT password FROM users WHERE id = ?',
      [user.id]
    );

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, user.id]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

export default router;
// export supprimé car déjà exporté plus haut
