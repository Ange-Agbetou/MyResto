-- Migration MySQL pour Restaurant Pro

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'manager') NOT NULL,
    restaurant_id INT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    owner_id INT NOT NULL,
    status ENUM('active', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('dish', 'drink') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    drink_category ENUM('plastic_small', 'glass_small', 'glass_large') NULL,
    restaurant_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des stocks
CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_threshold INT DEFAULT 5,
    max_threshold INT DEFAULT 100,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    manager_id INT NOT NULL,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'electronic') NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des articles de commande
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT NULL
);

-- Table des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('restock', 'sale', 'adjustment', 'waste') NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_type ENUM('order', 'manual', 'system') DEFAULT 'manual',
    reference_id INT NULL,
    user_id INT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions utilisateur
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des paramètres système
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_products_restaurant_type ON products(restaurant_id, type);
CREATE INDEX idx_stocks_product ON stocks(product_id);
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, created_at);
CREATE INDEX idx_orders_payment_method ON orders(payment_method);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_stock_movements_product_date ON stock_movements(product_id, created_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Insertion des données de base
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('app_name', 'Restaurant Pro', 'string', 'Nom de l''application'),
('app_version', '1.0.0', 'string', 'Version de l''application'),
('currency', 'XOF', 'string', 'Devise utilisée'),
('tax_rate', '0.00', 'number', 'Taux de taxe par défaut'),
('low_stock_threshold', '10', 'number', 'Seuil d''alerte de stock bas global'),
('backup_frequency', '24', 'number', 'Fréquence de sauvegarde en heures'),
('session_timeout', '1440', 'number', 'Durée de session en minutes (24h)');
