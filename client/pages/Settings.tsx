import React, { useState } from 'react';
import { apiService } from '@/lib/api';

export default function Settings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // À personnaliser côté backend !
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      // À remplacer par un vrai endpoint côté backend
      await new Promise(res => setTimeout(res, 1000));
      setSuccess('Mot de passe changé (simulation).');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Paramètres</h1>
        <form onSubmit={handleChangePassword} className="space-y-4 text-left">
          <div>
            <label className="block mb-1 font-medium">Ancien mot de passe</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Nouveau mot de passe</label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none text-black"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
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
            {loading ? 'Changement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
