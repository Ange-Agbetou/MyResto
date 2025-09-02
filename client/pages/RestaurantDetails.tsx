import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/lib/api';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiService.getRestaurantDetails(Number(id)).then(res => {
      if (res.error) setError(res.error);
      else setRestaurant(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Aucun restaurant trouvé.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-8 rounded-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>
        <p className="mb-2 text-muted-foreground">{restaurant.location}</p>
        <div className="mb-4">
          <strong>Statut :</strong> {restaurant.status || 'N/A'}
        </div>
        <div className="mb-2">Revenus du jour : <span className="font-semibold">{restaurant.daily_revenue || 0} XOF</span></div>
        <div className="mb-2">Commandes aujourd'hui : <span className="font-semibold">{restaurant.order_count || 0}</span></div>
        <div className="mb-2">Gérants : <span className="font-semibold">{restaurant.manager_count || 0}</span></div>
        <div className="mb-2">Alertes stock : <span className="font-semibold">{restaurant.stock_alerts || 0}</span></div>
        <button onClick={() => navigate(-1)} className="mt-4 bg-gradient-to-r from-neon-blue to-neon-purple text-white px-6 py-2 rounded-lg neon-glow-blue">Retour</button>
      </div>
    </div>
  );
}