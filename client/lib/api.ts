const API_BASE_URL = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  // Récupérer les commandes d'un restaurant pour une date donnée
  async getOrders(restaurantId: string, date: string) {
    const limit = 50;
    return this.request(`/orders/restaurant/${restaurantId}?date=${date}&limit=${limit}`);
  }
  // Supprimer un gérant
  async deleteManager(id: string) {
    return this.request(`/users/managers/${id}`, {
      method: 'DELETE',
    });
  }

  // Modifier un gérant
  async updateManager(id: string, username: string, restaurantId: string) {
    return this.request(`/users/managers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ username, restaurant_id: restaurantId }),
    });
  }
  // Supprimer un restaurant
  async deleteRestaurant(id: string) {
    return this.request(`/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  // Modifier un restaurant
  async updateRestaurant(id: string, name: string, location: string) {
    return this.request(`/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, location }),
    });
  }
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  async getRestaurantDetails(id: number) {
    return this.request(`/restaurants/${id}`);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Une erreur est survenue' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Erreur de connexion au serveur' };
    }
  }

  // Authentication
  async login(username: string, password: string, userType: 'owner' | 'manager') {
    const response = await this.request<{
      user: any;
      token: string;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, userType }),
    });

    if (response.data) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Restaurant management
  async getRestaurants() {
    return this.request('/restaurants');
  }

  async createRestaurant(name: string, location: string) {
    return this.request('/restaurants', {
      method: 'POST',
      body: JSON.stringify({ name, location }),
    });
  }

  // User management (Owner only)
  async createManager(username: string, password: string, restaurantId: number) {
    return this.request('/users/managers', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        restaurant_id: restaurantId,
      }),
    });
  }

  async getManagers() {
    return this.request('/users/managers');
  }

  // Products and menu
  async getProducts(restaurantId: number) {
    return this.request(`/products/${restaurantId}`);
  }

  // Orders
  async createOrder(orderData: {
    restaurant_id: number;
    items: Array<{
      product_id?: number;
      name: string;
      type: 'dish' | 'drink';
      drink_category?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    payment_method: 'cash' | 'electronic';
    total_amount: number;
  }) {
    const user = this.getUser();
    const managerRestaurantId = user && user.restaurant_id ? user.restaurant_id : orderData.restaurant_id;
    const processedItems: any[] = [];
    for (const item of orderData.items) {
      let productId = item.product_id;
      if (!productId) {
        const productResponse = await this.createProduct(
          managerRestaurantId,
          item.name,
          item.type,
          item.unit_price,
          item.drink_category
        );
        if (productResponse.data && (productResponse.data as any).product_id) {
          productId = (productResponse.data as any).product_id;
        }
      }
      // Ajout de l'article même si productId est undefined
      processedItems.push({
        product_id: productId,
        name: item.name,
        type: item.type,
        drink_category: item.drink_category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      });
    }

    if (processedItems.length === 0) {
      return { error: 'Aucun article valide à enregistrer.' };
    }

    // Envoi de la commande à /orders avec tous les articles
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...orderData,
        items: processedItems,
      }),
    });
  }

  private async createProduct(
    restaurantId: number,
    name: string,
    type: 'dish' | 'drink',
    price: number,
    drinkCategory?: string
  ) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify({
        restaurant_id: restaurantId,
        name,
        type,
        price,
        drink_category: drinkCategory,
      }),
    });
  }

  // Reports
  async getReport(restaurantId: number, date?: string) {
    const queryParam = date ? `?date=${date}` : '';
    return this.request(`/reports/${restaurantId}${queryParam}`);
  }

  async exportReportPDF(restaurantId: number, date?: string) {
    const queryParam = date ? `?date=${date}` : '';
    const url = `${API_BASE_URL}/reports/${restaurantId}/pdf${queryParam}`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `rapport-${date || 'today'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        return { data: { message: 'Rapport téléchargé avec succès' } };
      } else {
        const errorData = await response.json();
        return { error: errorData.error || 'Erreur lors du téléchargement' };
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      return { error: 'Erreur de connexion lors du téléchargement' };
    }
  }

  // Stock management
  async restockProduct(productId: number, quantity: number, notes?: string) {
    return this.request('/stock/restock', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity,
        notes,
      }),
    });
  }

  // Health check
  async ping() {
    return this.request('/ping');
  }
}

export const apiService = new ApiService();
