
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: 'c:/Mes Projets/Projet react native/zen-lab/server/.env' });
import mysql from 'mysql2/promise';
import { Pool, Client } from 'pg';

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

// Configuration par défaut basée sur les variables d'environnement
export const dbConfig: DatabaseConfig = {
  type: (process.env.DB_TYPE as 'mysql' | 'postgresql') || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'restaurant_user',
  password: process.env.DB_PASSWORD || 'restaurant_password',
  database: process.env.DB_NAME || 'restaurant_pro',
  ssl: process.env.DB_SSL === 'true'
};

// Pool de connexions
let mysqlPool: mysql.Pool | null = null;
let pgPool: Pool | null = null;

// Initialisation de la connexion
export const initializeDatabase = async () => {
  try {
  // DEBUG: Affiche toutes les variables d'environnement liées à la base de données
  console.log('DEBUG ENV DB_TYPE:', process.env.DB_TYPE);
  console.log('DEBUG ENV DB_HOST:', process.env.DB_HOST);
  console.log('DEBUG ENV DB_PORT:', process.env.DB_PORT);
  console.log('DEBUG ENV DB_USER:', process.env.DB_USER);
  console.log('DEBUG ENV DB_PASSWORD:', process.env.DB_PASSWORD);
  console.log('DEBUG ENV DB_NAME:', process.env.DB_NAME);
  console.log('DEBUG ENV DB_SSL:', process.env.DB_SSL);
  console.log('DB_USER utilisé:', dbConfig.user);
    if (dbConfig.type === 'mysql') {
      mysqlPool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
  ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined
      });

      // Test de la connexion
      const connection = await mysqlPool.getConnection();
      console.log('✅ Connexion MySQL établie avec succès');
      connection.release();
      
    } else if (dbConfig.type === 'postgresql') {
      pgPool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        max: 10,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false
      });

      // Test de la connexion
      const client = await pgPool.connect();
      console.log('✅ Connexion PostgreSQL établie avec succès');
      client.release();
    }
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    throw error;
  }
};

// Fonction générique pour exécuter des requêtes
export const executeQuery = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  try {
    if (dbConfig.type === 'mysql' && mysqlPool) {
      const [rows] = await mysqlPool.execute(query, params);
      return rows;
    } else if (dbConfig.type === 'postgresql' && pgPool) {
      const result = await pgPool.query(query, params);
      return result.rows;
    } else {
      throw new Error('Base de données non initialisée');
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
};

// Fonction pour récupérer une seule ligne
export const executeQuerySingle = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  const results = await executeQuery(query, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
};

// Fonction pour les insertions avec retour d'ID
export const executeInsert = async (
  query: string, 
  params: any[] = []
): Promise<{ insertId: number }> => {
  try {
    if (dbConfig.type === 'mysql' && mysqlPool) {
      const [result] = await mysqlPool.execute(query, params) as any;
      return { insertId: result.insertId };
    } else if (dbConfig.type === 'postgresql' && pgPool) {
      // Pour PostgreSQL, on doit utiliser RETURNING id
      const modifiedQuery = query.includes('RETURNING') ? query : query + ' RETURNING id';
      const result = await pgPool.query(modifiedQuery, params);
      return { insertId: result.rows[0]?.id || 0 };
    } else {
      throw new Error('Base de données non initialisée');
    }
  } catch (error) {
    console.error('Erreur lors de l\'insertion:', error);
    throw error;
  }
};

// Fermeture des connexions
export const closeDatabase = async () => {
  try {
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
      console.log('✅ Connexions MySQL fermées');
    }
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
      console.log('✅ Connexions PostgreSQL fermées');
    }
  } catch (error) {
    console.error('Erreur lors de la fermeture des connexions:', error);
  }
};

// Gestion propre de l'arrêt du processus
process.on('SIGINT', async () => {
  console.log('\n🔄 Fermeture de l\'application...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Arrêt du serveur...');
  await closeDatabase();
  process.exit(0);
});
