import bcrypt from 'bcryptjs';

// In-memory database for development
interface User {
  id: number;
  username: string;
  password: string;
  role: 'owner' | 'manager';
  restaurant_id?: number;
  created_by?: number;
  created_at: string;
}

interface Restaurant {
  id: number;
  name: string;
  location: string;
  owner_id: number;
  status: 'active' | 'closed';
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  type: 'dish' | 'drink';
  price: number;
  drink_category?: string;
  restaurant_id: number;
  created_at: string;
}

interface Stock {
  id: number;
  product_id: number;
  quantity: number;
  min_threshold: number;
  updated_at: string;
}

interface Order {
  id: number;
  restaurant_id: number;
  manager_id: number;
  total_amount: number;
  payment_method: 'cash' | 'electronic';
  created_at: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface StockMovement {
  id: number;
  product_id: number;
  type: 'restock' | 'sale';
  quantity: number;
  user_id: number;
  notes?: string;
  created_at: string;
}

// In-memory storage
const db = {
  users: [] as User[],
  restaurants: [] as Restaurant[],
  products: [] as Product[],
  stock: [] as Stock[],
  orders: [] as Order[],
  order_items: [] as OrderItem[],
  stock_movements: [] as StockMovement[],
  nextId: {
    users: 1,
    restaurants: 1,
    products: 1,
    stock: 1,
    orders: 1,
    order_items: 1,
    stock_movements: 1,
  }
};

// Helper functions
export const dbGet = async (query: string, params: any[] = []): Promise<any> => {
  // Simple query parser for common operations
  if (query.includes('SELECT * FROM users WHERE username = ?')) {
    return db.users.find(u => u.username === params[0]);
  }
  if (query.includes('SELECT id, username, role, restaurant_id FROM users WHERE id = ?')) {
    const user = db.users.find(u => u.id === params[0]);
    if (user) {
      return { id: user.id, username: user.username, role: user.role, restaurant_id: user.restaurant_id };
    }
  }
  if (query.includes('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?')) {
    return db.restaurants.find(r => r.id === params[0] && r.owner_id === params[1]);
  }
  if (query.includes('SELECT id FROM users WHERE username = ?')) {
    return db.users.find(u => u.username === params[0]);
  }
  if (query.includes('SELECT name, location FROM restaurants WHERE id = ?')) {
    const restaurant = db.restaurants.find(r => r.id === params[0]);
    if (restaurant) {
      return { name: restaurant.name, location: restaurant.location };
    }
  }
  if (query.includes('SELECT type FROM products WHERE id = ?')) {
    const product = db.products.find(p => p.id === params[0]);
    if (product) {
      return { type: product.type };
    }
  }
  if (query.includes('SELECT id FROM stock WHERE product_id = ?')) {
    return db.stock.find(s => s.product_id === params[0]);
  }
  return null;
};

export const dbAll = async (query: string, params: any[] = []): Promise<any[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  if (query.includes('FROM restaurants r') && query.includes('daily_stats')) {
    // Remplacer le filtre sur la date pour inclure toutes les commandes
    return db.restaurants
      .filter(r => r.owner_id === params[0])
      .map(r => {
        // Supprimer le filtre sur la date
        const allOrders = db.orders.filter(o => o.restaurant_id === r.id);
        const managers = db.users.filter(u => u.restaurant_id === r.id && u.role === 'manager');
        const totalRevenue = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
        const cashRevenue = allOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total_amount, 0);
        const electronicRevenue = allOrders.filter(o => o.payment_method === 'electronic').reduce((sum, o) => sum + o.total_amount, 0);
        
        // Stock alerts
        const restaurantProducts = db.products.filter(p => p.restaurant_id === r.id);
        const stockAlerts = restaurantProducts.filter(p => {
          const stock = db.stock.find(s => s.product_id === p.id);
          return stock && stock.quantity <= stock.min_threshold;
        }).length;
        
        return {
          ...r,
          daily_revenue: totalRevenue,
          cash_revenue: cashRevenue,
          electronic_revenue: electronicRevenue,
          order_count: allOrders.length,
          manager_count: managers.length,
          stock_alerts: stockAlerts
        };
      });
  }
  
  if (query.includes('FROM users u JOIN restaurants r')) {
    // Managers query
    return db.users
      .filter(u => u.role === 'manager' && u.created_by === params[0])
      .map(u => {
        const restaurant = db.restaurants.find(r => r.id === u.restaurant_id);
        return {
          ...u,
          restaurant_name: restaurant?.name || 'Unknown'
        };
      });
  }
  
  if (query.includes('FROM products p LEFT JOIN stock s')) {
    // Products with stock
    return db.products
      .filter(p => p.restaurant_id === params[0])
      .map(p => {
        const stock = db.stock.find(s => s.product_id === p.id);
        return {
          ...p,
          stock_quantity: stock?.quantity || 0,
          min_threshold: stock?.min_threshold || 0,
          low_stock: stock && stock.quantity <= stock.min_threshold ? 1 : 0
        };
      });
  }
  
  if (query.includes('FROM orders o JOIN order_items oi')) {
    // Report query
    const reportDate = params[1];
    const restaurantId = params[0];
    
    const orders = db.orders.filter(o => 
      o.restaurant_id === restaurantId && 
      o.created_at.startsWith(reportDate)
    );
    
    const result: any[] = [];
    
    orders.forEach(order => {
      const orderItems = db.order_items.filter(oi => oi.order_id === order.id);
      orderItems.forEach(item => {
        const product = db.products.find(p => p.id === item.product_id);
        if (product) {
          result.push({
            id: order.id,
            created_at: order.created_at,
            payment_method: order.payment_method,
            total_amount: order.total_amount,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_name: product.name,
            product_type: product.type,
            drink_category: product.drink_category
          });
        }
      });
    });
    
    return result;
  }
  
  return [];
};

export const dbRun = async (query: string, params: any[] = []): Promise<{ lastID: number }> => {
  const now = new Date().toISOString();
  
  if (query.includes('INSERT INTO users')) {
    const [username, password, role, restaurant_id, created_by] = params;
    const user: User = {
      id: db.nextId.users++,
      username,
      password,
      role,
      restaurant_id: restaurant_id || undefined,
      created_by: created_by || undefined,
      created_at: now
    };
    db.users.push(user);
    return { lastID: user.id };
  }
  
  if (query.includes('INSERT INTO restaurants')) {
    const [name, location, owner_id, status] = params;
    const restaurant: Restaurant = {
      id: db.nextId.restaurants++,
      name,
      location,
      owner_id,
      status: status || 'active',
      created_at: now
    };
    db.restaurants.push(restaurant);
    return { lastID: restaurant.id };
  }
  
  if (query.includes('INSERT INTO products')) {
    const [name, type, price, drink_category, restaurant_id] = params;
    const product: Product = {
      id: db.nextId.products++,
      name,
      type,
      price,
      drink_category: drink_category || undefined,
      restaurant_id,
      created_at: now
    };
    db.products.push(product);
    return { lastID: product.id };
  }
  
  if (query.includes('INSERT INTO stock')) {
    const [product_id, quantity, min_threshold] = params;
    const stock: Stock = {
      id: db.nextId.stock++,
      product_id,
      quantity,
      min_threshold: min_threshold || 5,
      updated_at: now
    };
    db.stock.push(stock);
    return { lastID: stock.id };
  }
  
  if (query.includes('INSERT INTO orders')) {
    const [restaurant_id, manager_id, total_amount, payment_method] = params;
    const order: Order = {
      id: db.nextId.orders++,
      restaurant_id,
      manager_id,
      total_amount,
      payment_method,
      created_at: now
    };
    db.orders.push(order);
    return { lastID: order.id };
  }
  
  if (query.includes('INSERT INTO order_items')) {
    const [order_id, product_id, quantity, unit_price, total_price] = params;
    const orderItem: OrderItem = {
      id: db.nextId.order_items++,
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price
    };
    db.order_items.push(orderItem);
    return { lastID: orderItem.id };
  }
  
  if (query.includes('INSERT INTO stock_movements')) {
    const [product_id, type, quantity, user_id, notes] = params;
    const movement: StockMovement = {
      id: db.nextId.stock_movements++,
      product_id,
      type,
      quantity,
      user_id,
      notes,
      created_at: now
    };
    db.stock_movements.push(movement);
    return { lastID: movement.id };
  }
  
  if (query.includes('UPDATE stock SET quantity = quantity - ?')) {
    const [quantity, product_id] = params;
    const stock = db.stock.find(s => s.product_id === product_id);
    if (stock) {
      stock.quantity -= quantity;
      stock.updated_at = now;
    }
    return { lastID: 0 };
  }
  
  if (query.includes('UPDATE stock SET quantity = quantity + ?')) {
    const [quantity, product_id] = params;
    const stock = db.stock.find(s => s.product_id === product_id);
    if (stock) {
      stock.quantity += quantity;
      stock.updated_at = now;
    }
    return { lastID: 0 };
  }
  
  return { lastID: 0 };
};

// Database initialization
export const initDatabase = async () => {
  try {
    console.log('Initializing in-memory database...');
    
    // Clear existing data
    Object.keys(db).forEach(key => {
      if (key !== 'nextId') {
        (db as any)[key] = [];
      }
    });
    
    // Seed initial data
    await seedData();
    
    console.log('✅ In-memory database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Seed initial data
const seedData = async () => {
  try {
    // Create default owner
    const hashedPassword = await bcrypt.hash('owner123', 10);
    const ownerResult = await dbRun(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      ['proprietaire', hashedPassword, 'owner']
    );
    
    const ownerId = ownerResult.lastID;
    
    // Create sample restaurants
    const restaurant1 = await dbRun(
      "INSERT INTO restaurants (name, location, owner_id) VALUES (?, ?, ?)",
      ['Restaurant Central', 'Centre-ville', ownerId]
    );
    
    const restaurant2 = await dbRun(
      "INSERT INTO restaurants (name, location, owner_id) VALUES (?, ?, ?)",
      ['Restaurant Sud', 'Zone Sud', ownerId]
    );
    
    const restaurant3 = await dbRun(
      "INSERT INTO restaurants (name, location, owner_id, status) VALUES (?, ?, ?, ?)",
      ['Restaurant Nord', 'Zone Nord', ownerId, 'closed']
    );
    
    // Create sample managers
    const managerPassword = await bcrypt.hash('manager123', 10);
    
    await dbRun(
      "INSERT INTO users (username, password, role, restaurant_id, created_by) VALUES (?, ?, ?, ?, ?)",
      ['gerant1', managerPassword, 'manager', restaurant1.lastID, ownerId]
    );
    
    await dbRun(
      "INSERT INTO users (username, password, role, restaurant_id, created_by) VALUES (?, ?, ?, ?, ?)",
      ['gerant2', managerPassword, 'manager', restaurant2.lastID, ownerId]
    );
    
    // Create sample products and stock for restaurant 1
    const products = [
      { name: 'Riz au poisson', type: 'dish', price: 2500, restaurant_id: restaurant1.lastID },
      { name: 'Poulet braisé', type: 'dish', price: 3000, restaurant_id: restaurant1.lastID },
      { name: 'Thiéboudienne', type: 'dish', price: 2800, restaurant_id: restaurant1.lastID },
      { name: 'Coca-Cola', type: 'drink', price: 500, drink_category: 'plastic_small', restaurant_id: restaurant1.lastID },
      { name: 'Fanta', type: 'drink', price: 800, drink_category: 'glass_small', restaurant_id: restaurant1.lastID },
      { name: 'Eau minérale', type: 'drink', price: 300, drink_category: 'plastic_small', restaurant_id: restaurant1.lastID }
    ];
    
    for (const product of products) {
      const productResult = await dbRun(
        "INSERT INTO products (name, type, price, drink_category, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        [product.name, product.type, product.price, product.drink_category || null, product.restaurant_id]
      );
      
      // Add initial stock for drinks
      if (product.type === 'drink') {
        await dbRun(
          "INSERT INTO stock (product_id, quantity, min_threshold) VALUES (?, ?, ?)",
          [productResult.lastID, 50, 10]
        );
      }
    }
    
    console.log('📊 Database seeded with sample data');
    console.log('👤 Default Owner: proprietaire / owner123');
    console.log('👨‍💼 Sample Manager: gerant1 / manager123');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Ajout d'une fonction pour vider la base de données (in-memory)
export const clearDatabase = () => {
  Object.keys(db).forEach(key => {
    if (key !== 'nextId') {
      (db as any)[key] = [];
    }
  });
  // Réinitialiser les compteurs d'ID
  Object.keys(db.nextId).forEach(key => {
    db.nextId[key] = 1;
  });
  console.log('✅ Base de données vidée');
};

export default db;
