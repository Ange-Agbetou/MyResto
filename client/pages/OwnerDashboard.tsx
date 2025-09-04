
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiService } from '@/lib/api';
import {
  StoreIcon,
  SettingsIcon,
  LogOutIcon,
  DollarSignIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  PlusIcon,
  UsersIcon,
  BarChart3Icon,
  EyeIcon
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  location: string;
  dailyRevenue: number;
  cashRevenue: number;
  electronicRevenue: number;
  orders: number;
  managers: number;
  stockAlerts: number;
  status: 'active' | 'closed';
}

export default function OwnerDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = apiService.getUser();
    if (!userData || userData.role !== 'owner') {
      window.location.href = '/login';
      return;
    }
    setUser(userData);
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await apiService.getRestaurants();
      if (response.error) {
        alert(`Erreur: ${response.error}`);
      } else if (response.data && Array.isArray(response.data)) {
        // Transform API data to match interface
        const transformedData = response.data.map((r: any) => ({
          id: r.id.toString(),
          name: r.name,
          location: r.location,
          dailyRevenue: r.daily_revenue || 0,
          cashRevenue: r.cash_revenue || 0,
          electronicRevenue: r.electronic_revenue || 0,
          orders: r.order_count || 0,
          managers: r.manager_count || 0,
          stockAlerts: r.stock_alerts || 0,
          status: r.status || 'active'
        }));
        setRestaurants(transformedData);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
      alert('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = restaurants.reduce((sum, r) => sum + r.dailyRevenue, 0);
  const totalCash = restaurants.reduce((sum, r) => sum + r.cashRevenue, 0);
  const totalElectronic = restaurants.reduce((sum, r) => sum + r.electronicRevenue, 0);
  const totalOrders = restaurants.reduce((sum, r) => sum + r.orders, 0);
  const totalAlerts = restaurants.reduce((sum, r) => sum + r.stockAlerts, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const handleLogout = () => {
    apiService.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="glass rounded-lg p-8 text-center">
          <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="glass-dark border-b border-glass-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center neon-glow-blue">
                <StoreIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                  MyResto 
                </h1>
                <p className="text-sm text-muted-foreground">Tableau de bord propriétaire</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-glass-border text-destructive"
                onClick={handleLogout}
              >
                <LogOutIcon className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Global Stats */}
  <div className="flex flex-wrap justify-center gap-8 mb-10">
          <Card className="glass border-glass-border neon-glow-blue min-w-[250px] max-w-[300px] flex-1">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <DollarSignIcon className="w-10 h-10 text-neon-blue mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Revenus Total</p>
              <p className="text-2xl font-bold text-neon-blue">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border neon-glow-purple min-w-[250px] max-w-[300px] flex-1">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <TrendingUpIcon className="w-10 h-10 text-neon-purple mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Commandes</p>
              <p className="text-2xl font-bold text-neon-purple">{totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border neon-glow-pink min-w-[250px] max-w-[300px] flex-1">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <StoreIcon className="w-10 h-10 text-neon-pink mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Restaurants</p>
              <p className="text-2xl font-bold text-neon-pink">{restaurants.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-neon-cyan">Répartition des Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Espèces</span>
                  <span className="font-bold text-green-400">{formatCurrency(totalCash)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                    style={{ width: `${(totalCash / totalRevenue) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Électronique</span>
                  <span className="font-bold text-blue-400">{formatCurrency(totalElectronic)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                    style={{ width: `${(totalElectronic / totalRevenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-neon-cyan">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full neon-glow-blue bg-gradient-to-r from-neon-blue to-neon-purple">
                <PlusIcon className="w-4 h-4 mr-2" />
                Ajouter un Restaurant
              </Button>
              <Link to="/reports">
                <Button variant="outline" className="w-full border-glass-border">
                  <BarChart3Icon className="w-4 h-4 mr-2" />
                  Rapport Consolidé
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Restaurants List */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-neon-cyan">Mes Restaurants</CardTitle>
            <CardDescription>Vue d'ensemble de tous vos établissements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {restaurants.map((restaurant) => (
                <Card key={restaurant.id} className="glass-dark border-glass-border">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      <div className="lg:col-span-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${restaurant.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <div>
                            <h3 className="font-semibold text-foreground">{restaurant.name}</h3>
                            <p className="text-sm text-muted-foreground">{restaurant.location}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Revenus</p>
                        <p className="font-bold text-neon-blue">{formatCurrency(restaurant.dailyRevenue)}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Commandes</p>
                        <p className="font-bold">{restaurant.orders}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Gérants</p>
                        <p className="font-bold">{restaurant.managers}</p>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        {restaurant.stockAlerts > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangleIcon className="w-3 h-3 mr-1" />
                            {restaurant.stockAlerts} alerte{restaurant.stockAlerts > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {/* Bouton Voir supprimé */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
