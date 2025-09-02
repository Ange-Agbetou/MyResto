import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { dbGet } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-pro-secret-key-2025';

export interface AuthUser {
  id: number;
  username: string;
  role: 'owner' | 'manager';
  restaurant_id?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Generate JWT token
export const generateToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      restaurant_id: user.restaurant_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token: string): AuthUser | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('AUTH DEBUG - Authorization header:', authHeader);
  console.log('AUTH DEBUG - Token:', token);

  if (!token) {
    console.log('AUTH DEBUG - Aucun token fourni');
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  const user = verifyToken(token);
  console.log('AUTH DEBUG - Résultat verifyToken:', user);
  if (!user) {
    console.log('AUTH DEBUG - Token JWT invalide');
    return res.status(403).json({ error: 'Token invalide' });
  }

  // Verify user still exists in database
  try {
    const dbUser = await dbGet(
      "SELECT id, username, role, restaurant_id FROM users WHERE id = ?",
      [user.id]
    ) as AuthUser;
    console.log('AUTH DEBUG - Utilisateur trouvé en base:', dbUser);

    if (!dbUser) {
      console.log('AUTH DEBUG - Utilisateur non trouvé en base');
      return res.status(403).json({ error: 'Utilisateur non trouvé' });
    }

    req.user = dbUser;
    next();
  } catch (error) {
    console.log('AUTH DEBUG - Erreur lors de la vérification utilisateur:', error);
    return res.status(500).json({ error: 'Erreur de vérification utilisateur' });
  }
};

// Owner-only middleware
export const requireOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Accès propriétaire requis' });
  }
  next();
};

// Manager-only middleware (includes owner)
export const requireManager = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['owner', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès gérant ou propriétaire requis' });
  }
  next();
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Compare password
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Login function
export const loginUser = async (username: string, password: string): Promise<{ user: AuthUser; token: string } | null> => {
  try {
    const user = await dbGet(
      "SELECT id, username, password, role, restaurant_id FROM users WHERE username = ?",
      [username]
    ) as any;

    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      restaurant_id: user.restaurant_id
    };

    const token = generateToken(authUser);

    return { user: authUser, token };
  } catch (error) {
    console.error('Error during login:', error);
    return null;
  }
};
