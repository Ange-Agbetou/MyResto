-- Migration PostgreSQL pour Restaurant Pro

-- Création des types ENUM personnalisés
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE restaurant_status AS ENUM ('active', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('dish', 'drink');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE drink_category AS ENUM ('plastic_small', 'glass_small', 'glass_large');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'electronic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('restock', 'sale', 'adjustment', 'waste');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reference_type AS ENUM ('order', 'manual', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE setting_type AS ENUM ('string', 'number', 'boolean', 'json');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    restaurant_id INTEGER NULL,
    created_by INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    owner_id INTEGER NOT NULL,
    status restaurant_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type product_type NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    drink_category drink_category NULL,
    restaurant_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des stocks
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    max_threshold INTEGER DEFAULT 100,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL,
    manager_id INTEGER NOT NULL,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    status order_status DEFAULT 'completed',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des articles de commande
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT NULL
);

-- Table des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    movement_type movement_type NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_type reference_type DEFAULT 'manual',
    reference_id INTEGER NULL,
    user_id INTEGER NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions utilisateur
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NULL,
    setting_type setting_type DEFAULT 'string',
    description TEXT NULL,
    updated_by INTEGER NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contraintes de clés étrangères
ALTER TABLE restaurants 
ADD CONSTRAINT fk_restaurants_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE users 
ADD CONSTRAINT fk_users_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD CONSTRAINT fk_users_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE products 
ADD CONSTRAINT fk_products_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE stocks 
ADD CONSTRAINT fk_stocks_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT fk_orders_manager 
FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_order 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE stock_movements 
ADD CONSTRAINT fk_stock_movements_product 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE stock_movements 
ADD CONSTRAINT fk_stock_movements_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_sessions 
ADD CONSTRAINT fk_user_sessions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE system_settings 
ADD CONSTRAINT fk_system_settings_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_type ON products(restaurant_id, type);
CREATE INDEX IF NOT EXISTS idx_stocks_product ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_date ON orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Trigger pour mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertion des données de base
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('app_name', 'Restaurant Pro', 'string', 'Nom de l''application'),
('app_version', '1.0.0', 'string', 'Version de l''application'),
('currency', 'XOF', 'string', 'Devise utilisée'),
('tax_rate', '0.00', 'number', 'Taux de taxe par défaut'),
('low_stock_threshold', '10', 'number', 'Seuil d''alerte de stock bas global'),
('backup_frequency', '24', 'number', 'Fréquence de sauvegarde en heures'),
('session_timeout', '1440', 'number', 'Durée de session en minutes (24h)')
ON CONFLICT (setting_key) DO NOTHING;
