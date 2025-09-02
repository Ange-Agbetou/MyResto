import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Settings from './pages/Settings';
import AddRestaurant from './pages/AddRestaurant';
import OwnerDashboard from './pages/OwnerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import Reports from './pages/Reports';
import RestaurantDetails from './pages/RestaurantDetails';
import './global.css';

// Simple placeholder component
const Placeholder = ({ title, backText }: { title: string; backText: string }) => (
  <div className="min-h-screen grid-bg flex items-center justify-center">
    <div className="glass rounded-lg p-8 text-center max-w-md">
      <h2 className="text-xl font-bold text-neon-purple mb-4">{title}</h2>
      <p className="text-muted-foreground mb-6">
        Cette page sera bientôt disponible. Continuez à demander des améliorations pour compléter cette fonctionnalité.
      </p>
      <button 
        onClick={() => window.history.back()}
        className="bg-gradient-to-r from-neon-blue to-neon-purple text-white px-6 py-2 rounded-lg neon-glow-blue"
      >
        {backText}
      </button>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        
        {/* Owner Routes */}
        <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/reports" element={<Reports />} />index-BN8rEIN_.js:67 
 
 GET http://localhost:3000/api/users/managers 403 (Forbidden)
request	@	index-BN8rEIN_.js:67
getManagers	@	index-BN8rEIN_.js:67
K	@	index-BN8rEIN_.js:111
(anonymous)	@	index-BN8rEIN_.js:111
Bl	@	index-BN8rEIN_.js:40
Ar	@	index-BN8rEIN_.js:40
df	@	index-BN8rEIN_.js:40
Nn	@	index-BN8rEIN_.js:38
Nv	@	index-BN8rEIN_.js:40
er	@	index-BN8rEIN_.js:40
cf	@	index-BN8rEIN_.js:40
F	@	index-BN8rEIN_.js:25
te	@	index-BN8rEIN_.js:25
[NEW] Explain Console errors by using Copilot in Edge: click 
 to explain an error. Learn more
Don't show again
﻿


        
        {/* Manager Routes */}
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        
        {/* Restaurant details */}
        <Route 
          path="/restaurant/:id" 
          element={<RestaurantDetails />} 
        />
        <Route 
          path="/stock" 
          element={<Placeholder title="Gestion des Stocks" backText="Retour au tableau de bord" />} 
        />
        <Route 
          path="/users" 
          element={<Placeholder title="Gestion des Utilisateurs" backText="Retour au tableau de bord" />} 
        />
        <Route 
          path="/settings" 
          element={<Settings />} 
        />
        <Route 
          path="/add-restaurant" 
          element={<AddRestaurant />} 
        />
         {/* Removed Managers route */}
         {/* <Route 
           path="/managers"
           element={<Managers />} 
         /> */}
// import Managers from './pages/Managers';
        
        {/* Catch-all route for 404 */}
        <Route 
          path="*" 
          element={<Placeholder title="Page Non Trouvée" backText="Retour à l'accueil" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
