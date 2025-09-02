import { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  TrendingUpIcon,
  DownloadIcon,
  BanknoteIcon,
  CreditCardIcon,
  DollarSignIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/lib/api';
import { Link } from 'react-router-dom';

interface OrderRecord {
  id: string;
  time: string;
  product: string;
  type: 'dish' | 'drink';
  unitPrice: number;
  quantity: number;
  total: number;
  paymentMethod: 'cash' | 'electronic';
  drinkCategory?: string;
}

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = apiService.getUser();
    if (!userData) {
      window.location.href = '/login';
      return;
    }
    setUser(userData);
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      loadReport();
    }
  }, [selectedRestaurant, selectedDate]);

  const loadRestaurants = async () => {
    try {
      const response = await apiService.getRestaurants();
      if (response.error) {
        alert(`Erreur: ${response.error}`);
      } else if (response.data && Array.isArray(response.data)) {
        setRestaurants(response.data);
  if (Array.isArray(response.data) && response.data.length > 0) {
          setSelectedRestaurant(response.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
      alert('Erreur de chargement des restaurants');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    if (!selectedRestaurant) return;

    setLoading(true);
    try {
      const response = await apiService.getReport(parseInt(selectedRestaurant), selectedDate);
      if (response.error) {
        alert(`Erreur: ${response.error}`);
        setOrders([]);
      } else if (response.data) {
        // Typage explicite pour éviter l'erreur TS
        const data = response.data as { orders?: any[] };
        const transformedOrders = Array.isArray(data.orders)
          ? data.orders.map((order: any) => ({
              id: order.id.toString(),
              time: new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              product: order.product_name,
              type: order.product_type,
              unitPrice: Number(order.unit_price) || 0,
              quantity: Number(order.quantity) || 0,
              total: Number(order.total_price) || 0,
              paymentMethod: order.payment_method,
              drinkCategory: order.drink_category
            }))
          : [];
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Erreur de chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const cashTotal = orders
    .filter(order => order.paymentMethod === 'cash')
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const electronicTotal = orders
    .filter(order => order.paymentMethod === 'electronic')
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const grandTotal = cashTotal + electronicTotal;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const exportReport = async () => {
    if (!selectedRestaurant) return;

    try {
      const response = await apiService.exportReportPDF(parseInt(selectedRestaurant), selectedDate);
      if (response.error) {
        alert(`Erreur d'export: ${response.error}`);
      }
      // Success message is handled in the API service
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export PDF');
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="glass-dark border-b border-glass-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/owner-dashboard">
                <Button variant="outline" size="sm" className="border-glass-border">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-lg flex items-center justify-center neon-glow-cyan">
                  <TrendingUpIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent">
                    Rapports Journaliers
                  </h1>
                  <p className="text-sm text-muted-foreground">Analyse des ventes et performances</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={exportReport}
              className="neon-glow-blue bg-gradient-to-r from-neon-blue to-neon-purple"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass border-glass-border">
            <CardContent className="p-4">
              <Label className="text-sm font-medium">Restaurant</Label>
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant} disabled={loading}>
                <SelectTrigger className="glass-dark border-glass-border mt-2">
                  <SelectValue placeholder="Sélectionner un restaurant" />
                </SelectTrigger>
                <SelectContent className="glass-dark border-glass-border">
                  {restaurants.map(restaurant => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border">
            <CardContent className="p-4">
              <Label className="text-sm font-medium">Date</Label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-transparent border border-glass-border rounded-md text-sm glass-dark"
              />
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement du rapport...</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass border-glass-border neon-glow-green">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Espèces</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(cashTotal)}</p>
                </div>
                <BanknoteIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border neon-glow-blue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Électronique</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(electronicTotal)}</p>
                </div>
                <CreditCardIcon className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-glass-border neon-glow-cyan">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">💰 Total Général</p>
                  <p className="text-2xl font-bold text-neon-cyan">{formatCurrency(grandTotal)}</p>
                </div>
                <DollarSignIcon className="w-8 h-8 text-neon-cyan" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report Table */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center text-neon-cyan">
              📅 Rapport du {formatDate(selectedDate)}
            </CardTitle>
            <CardDescription>
              {restaurants.find(r => r.id === selectedRestaurant)?.name} - Détail des ventes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Heure</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Produit / Plat</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Prix unitaire</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Quantité</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Mode de paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-glass-border/50 hover:bg-glass-dark/30 transition-colors">
                      <td className="py-4 px-4 text-sm font-mono">{order.time}</td>
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-medium">{order.product}</span>
                          {order.drinkCategory && (
                            <div className="text-xs text-muted-foreground mt-1">{order.drinkCategory}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={order.type === 'dish' ? 'default' : 'secondary'}>
                          {order.type === 'dish' ? 'Plat' : 'Boisson'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">{formatCurrency(order.unitPrice)}</td>
                      <td className="py-4 px-4 text-center">{order.quantity}</td>
                      <td className="py-4 px-4 text-right font-bold">{formatCurrency(order.total)}</td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={order.paymentMethod === 'cash' ? 'bg-green-600' : 'bg-blue-600'}>
                          {order.paymentMethod === 'cash' ? 'Espèces' : 'Électronique'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neon-cyan bg-glass-dark/50">
                    <td colSpan={5} className="py-4 px-4 text-right font-bold text-lg">
                      TOTAUX:
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-xl text-neon-cyan">
                      {formatCurrency(grandTotal)}
                    </td>
                    <td className="py-4 px-4"></td>
                  </tr>
                  <tr className="bg-glass-dark/30">
                    <td colSpan={5} className="py-2 px-4 text-right text-sm font-medium text-green-400">
                      Total espèces:
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-green-400">
                      {formatCurrency(cashTotal)}
                    </td>
                    <td className="py-2 px-4"></td>
                  </tr>
                  <tr className="bg-glass-dark/30">
                    <td colSpan={5} className="py-2 px-4 text-right text-sm font-medium text-blue-400">
                      Total électronique:
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-blue-400">
                      {formatCurrency(electronicTotal)}
                    </td>
                    <td className="py-2 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
