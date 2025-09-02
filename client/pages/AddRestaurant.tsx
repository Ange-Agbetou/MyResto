import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/lib/api';

export default function AddRestaurant() {
  const [restaurants, setRestaurants] = useState<Array<{id: string, name: string, location: string}>>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRestaurant, setEditRestaurant] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  React.useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
  const res = await apiService.getRestaurants();
  if (res.data) setRestaurants(res.data as Array<{id: string, name: string, location: string}>);
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce restaurant ?')) {
      const res = await apiService.deleteRestaurant(id);
      if (res.error) alert(res.error);
      loadRestaurants();
    }
  };

  const handleEditRestaurant = (restaurant: any) => {
    setEditRestaurant(restaurant);
    setEditName(restaurant.name);
    setEditLocation(restaurant.location);
    setEditModalOpen(true);
    setEditError(null);
  };
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
  // Utiliser une méthode publique (à ajouter dans apiService si besoin)
  const response = await apiService.createRestaurant(name, location);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess('Restaurant créé avec succès !');
        setTimeout(() => navigate('/owner-dashboard'), 1200);
      }
    } catch (err) {
      setError('Erreur lors de la création du restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="glass p-8 rounded-lg w-full max-w-md mb-8">
        <h1 className="text-2xl font-bold mb-4">Ajouter un restaurant</h1>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block mb-1 font-medium">Nom du restaurant</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Localisation</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white py-2 rounded-lg neon-glow-blue font-semibold"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Ajouter'}
          </button>
        </form>
      </div>
      {/* Liste des restaurants */}
      <div className="glass p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Mes restaurants</h2>
        <div className="space-y-4">
          {restaurants.map(r => (
            <div key={r.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-muted-foreground">{r.location}</div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="secondary" onClick={() => handleEditRestaurant(r)}>
                  Modifier
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteRestaurant(r.id)}>
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Modale d'édition */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <h2 className="text-xl font-bold mb-4">Modifier le restaurant</h2>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setEditLoading(true);
              setEditError(null);
              try {
                const res = await apiService.updateRestaurant(editRestaurant?.id, editName, editLocation);
                if (res.error) {
                  setEditError(res.error);
                } else {
                  setEditModalOpen(false);
                  loadRestaurants();
                }
              } catch {
                setEditError('Erreur lors de la modification');
              } finally {
                setEditLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block mb-1 font-medium">Nom</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Localisation</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
                type="text"
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                required
              />
            </div>
            {editError && <div className="text-red-500 text-sm">{editError}</div>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={editLoading} className="bg-gradient-to-r from-neon-blue to-neon-purple text-white">
                {editLoading ? 'Modification...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
