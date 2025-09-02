import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery, executeQuerySingle, dbConfig } from '../config/database.js';
import bcrypt from 'bcryptjs';

interface Migration {
  version: string;
  name: string;
  filename: string;
}

export class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.migrationsPath = path.join(__dirname, '.');
  }

  // Créer la table des migrations si elle n'existe pas
  private async createMigrationsTable(): Promise<void> {
    const createTableQuery = dbConfig.type === 'mysql' 
      ? `
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          version VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      : `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

    await executeQuery(createTableQuery);
  }

  // Obtenir la liste des migrations disponibles
  private getMigrationFiles(): Migration[] {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql') && !file.includes('postgresql'))
      .sort();

    return files.map(file => {
      const version = file.split('_')[0];
      const name = file.replace('.sql', '').replace(/^\d+_/, '');
      return { version, name, filename: file };
    });
  }

  // Obtenir les migrations déjà exécutées
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const rows = await executeQuery('SELECT version FROM migrations ORDER BY version');
      return rows.map((row: any) => row.version);
    } catch (error) {
      // La table n'existe pas encore
      return [];
    }
  }

  // Exécuter une migration
  private async executeMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Exécution de la migration ${migration.version}: ${migration.name}`);

    const migrationFile = dbConfig.type === 'postgresql' && 
                         fs.existsSync(path.join(this.migrationsPath, migration.filename.replace('.sql', '_postgresql.sql')))
      ? migration.filename.replace('.sql', '_postgresql.sql')
      : migration.filename;

    const sqlContent = fs.readFileSync(path.join(this.migrationsPath, migrationFile), 'utf8');
    
    // Diviser les requêtes SQL (séparées par ;)
    const queries = sqlContent
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0 && !query.startsWith('--'));

    // Exécuter chaque requête
    for (const query of queries) {
      if (query.trim()) {
        try {
          await executeQuery(query);
        } catch (error) {
          console.error(`❌ Erreur dans la requête: ${query.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    // Marquer la migration comme exécutée
    await executeQuery(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name]
    );

    console.log(`✅ Migration ${migration.version} exécutée avec succès`);
  }

  // Exécuter toutes les migrations en attente
  public async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Démarrage des migrations de base de données...');

      await this.createMigrationsTable();

      const availableMigrations = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Aucune migration en attente');
        return;
      }

      console.log(`📊 ${pendingMigrations.length} migration(s) en attente`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 Toutes les migrations ont été exécutées avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution des migrations:', error);
      throw error;
    }
  }

  // Insérer les données de test
  public async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Insertion des données de test...');

      // Vérifier si des utilisateurs existent déjà
      const existingUsers = await executeQuerySingle('SELECT COUNT(*) as count FROM users');
      if (existingUsers.count > 0) {
        console.log('ℹ️ Des données existent déjà, pas d\'insertion de données de test');
        return;
      }

      // Créer le propriétaire par défaut
      const hashedPassword = await bcrypt.hash('owner123', 10);
      const ownerResult = await executeQuery(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['proprietaire', hashedPassword, 'owner']
      );

      let ownerId: number;
      if (dbConfig.type === 'mysql') {
        ownerId = (ownerResult as any).insertId;
      } else {
        const owner = await executeQuerySingle('SELECT id FROM users WHERE username = ?', ['proprietaire']);
        ownerId = owner.id;
      }

      // Créer les restaurants de test
      const restaurants = [
        { name: 'Restaurant Central', location: 'Centre-ville' },
        { name: 'Restaurant Sud', location: 'Zone Sud' },
        { name: 'Restaurant Nord', location: 'Zone Nord' }
      ];

      const restaurantIds: number[] = [];
      for (const restaurant of restaurants) {
        const result = await executeQuery(
          'INSERT INTO restaurants (name, location, owner_id) VALUES (?, ?, ?)',
          [restaurant.name, restaurant.location, ownerId]
        );
        
        if (dbConfig.type === 'mysql') {
          restaurantIds.push((result as any).insertId);
        } else {
          const rest = await executeQuerySingle(
            'SELECT id FROM restaurants WHERE name = ? AND owner_id = ?', 
            [restaurant.name, ownerId]
          );
          restaurantIds.push(rest.id);
        }
      }

      // Créer des gérants de test
      const managerPassword = await bcrypt.hash('manager123', 10);
      for (let i = 0; i < restaurantIds.length; i++) {
        await executeQuery(
          'INSERT INTO users (username, password, role, restaurant_id, created_by) VALUES (?, ?, ?, ?, ?)',
          [`gerant${i + 1}`, managerPassword, 'manager', restaurantIds[i], ownerId]
        );
      }

      // Créer des produits de test pour le premier restaurant
      const products = [
        { name: 'Riz au poisson', type: 'dish', price: 2500 },
        { name: 'Poulet braisé', type: 'dish', price: 3000 },
        { name: 'Thiéboudienne', type: 'dish', price: 2800 },
        { name: 'Coca-Cola', type: 'drink', price: 500, category: 'plastic_small' },
        { name: 'Fanta', type: 'drink', price: 800, category: 'glass_small' },
        { name: 'Eau minérale', type: 'drink', price: 300, category: 'plastic_small' }
      ];

      for (const product of products) {
        const result = await executeQuery(
          'INSERT INTO products (name, type, price, drink_category, restaurant_id) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.type, product.price, product.category || null, restaurantIds[0]]
        );

        // Ajouter du stock initial pour les boissons
        if (product.type === 'drink') {
          let productId: number;
          if (dbConfig.type === 'mysql') {
            productId = (result as any).insertId;
          } else {
            const prod = await executeQuerySingle(
              'SELECT id FROM products WHERE name = ? AND restaurant_id = ?',
              [product.name, restaurantIds[0]]
            );
            productId = prod.id;
          }

          await executeQuery(
            'INSERT INTO stocks (product_id, quantity, min_threshold) VALUES (?, ?, ?)',
            [productId, 50, 10]
          );
        }
      }

      console.log('✅ Données de test insérées avec succès');
      console.log('👤 Propriétaire: proprietaire / owner123');
      console.log('👨‍💼 Gérants: gerant1, gerant2, gerant3 / manager123');

    } catch (error) {
      console.error('❌ Erreur lors de l\'insertion des données de test:', error);
      throw error;
    }
  }
}

// Export d'une instance par défaut
export const migrator = new DatabaseMigrator();
