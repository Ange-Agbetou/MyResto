import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initializeDatabase } from "./config/database.js";
import { migrator } from "./migrations/migrator.js";
import authRoutes from "./routes/auth.js";
import restaurantRoutes from "./routes/restaurants.js";
import orderRoutes from "./routes/orders.js";
import stockRoutes from "./routes/stock.js";
import reportRoutes from "./routes/reports.js";
import simpleApiRoutes from "./routes/simple-api.js";
import apiRoutes from "./routes/api.js";

export function createServer() {
  const app = express();

  // Rate limiting pour les API
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Appliquer le rate limiting uniquement aux routes API
  app.use('/api/', limiter);

  // Configuration CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Middleware de parsing
  app.use(express.json({ 
    limit: process.env.UPLOAD_MAX_SIZE || '10mb' 
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.UPLOAD_MAX_SIZE || '10mb' 
  }));

  // Middleware de logging
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
  });

  // Health check
  app.get("/api/ping", (_req, res) => {
    res.json({ 
      message: "Restaurant Pro API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: process.env.DB_TYPE || 'mysql'
    });
  });

  // Routes API
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api', apiRoutes);
  app.use('/api', simpleApiRoutes);

  // Middleware de gestion d'erreurs
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ API Error:', err);
    
    // Ne pas exposer les détails d'erreur en production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({ 
      error: err.message || 'Erreur interne du serveur',
      ...(isDevelopment && { 
        stack: err.stack,
        details: err 
      })
    });
  });

  // 404 pour les routes API non trouvées
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        error: 'Endpoint API non trouvé',
        path: req.path,
        method: req.method
      });
    }
    next();
  });

  // Initialisation de la base de données au démarrage
  const initializeApp = async () => {
    try {
      console.log('🚀 Démarrage de Restaurant Pro API...');
      console.log(`📊 Type de base de données: ${process.env.DB_TYPE || 'mysql'}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);

      // Connexion à la base de données
      await initializeDatabase();

      // Exécution des migrations
      await migrator.runMigrations();

      // Insertion des données de test en développement
      if (process.env.NODE_ENV !== 'production') {
        await migrator.seedDatabase();
      }

      console.log('✅ Restaurant Pro API prêt !');
      console.log('📖 Documentation API disponible sur /api/ping');
      console.log('🔐 Comptes de test :');
      console.log('   👤 Propriétaire : proprietaire / owner123');
      console.log('   👨‍💼 Gérant : gerant1 / manager123');
      console.log(`🌐 CORS configuré pour : ${process.env.CORS_ORIGIN || 'tous les domaines'}`);

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      
      if (process.env.NODE_ENV === 'production') {
        console.error('🚫 Arrêt de l\'application en raison de l\'erreur de base de données');
        process.exit(1);
      } else {
        console.warn('⚠️ Continuité en mode développement malgré l\'erreur de base de données');
      }
    }
  };

  // Démarrer l'initialisation
  initializeApp();

  return app;
}
