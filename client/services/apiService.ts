// apiService.ts
// Service API pour ManagerDashboard

import axios from "axios";

const API_BASE = "/api";

export default {
  async getRestaurants() {
  const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${API_BASE}/restaurants`, { headers });
    return res.data;
  },
  async getRestaurantById(id: string) {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${API_BASE}/restaurants/${id}`, { headers });
    return res.data;
  },
  async getOrders(restaurantId: string, date: string) {
  const token = localStorage.getItem("auth_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const limit = 50;
  const res = await axios.get(`${API_BASE}/orders/restaurant/${restaurantId}?date=${date}&limit=${limit}`, { headers });
  return res.data;
  },
  async createOrder({ restaurant_id, items, payment_method, total_amount }: {
  restaurant_id: number;
    items: any[];
    payment_method: string;
    total_amount: number;
  }) {
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    console.log('API DEBUG - Headers envoyés:', headers);
    const res = await axios.post(`${API_BASE}/orders`, {
      restaurant_id,
      items,
      payment_method,
      total_amount,
    }, { headers });
    return res.data;
  },
};
