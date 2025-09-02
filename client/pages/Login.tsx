import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// ...existing code...
import { apiService } from '@/lib/api';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'owner' | 'manager'>('owner');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const response = await apiService.login(username, password, userType);

      if (response.error) {
        alert(`Erreur de connexion: ${response.error}`);
      } else if (response.data && response.data.user && response.data.user.role) {
        // Redirection selon le type d'utilisateur
        const redirectUrl = response.data.user.role === 'owner' ? '/owner-dashboard' : '/manager-dashboard';
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg">
        {/* Floating geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-br from-neon-pink/20 to-neon-cyan/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-neon-green/20 to-neon-blue/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        
        {/* Animated lines */}
        <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-neon-cyan/30 to-transparent animate-neon-pulse"></div>
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-neon-pink/30 to-transparent animate-neon-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md glass border-glass-border">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center neon-glow-blue">
              <span>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                MyResto 
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Système de gestion de restaurant.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={userType === 'owner' ? 'default' : 'outline'}
                onClick={() => setUserType('owner')}
                className={`relative ${userType === 'owner' ? 'neon-glow-blue' : ''}`}
              >
                Propriétaire
              </Button>
              <Button
                type="button"
                variant={userType === 'manager' ? 'default' : 'outline'}
                onClick={() => setUserType('manager')}
                className={`relative ${userType === 'manager' ? 'neon-glow-purple' : ''}`}
              >
                Gérant
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M2 14c0-2.5 3-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </span>
                  <Input
                    id="username"
                    name="username"
                    placeholder="Entrez votre nom d'utilisateur"
                    className="pl-10 glass-dark border-glass-border focus:neon-glow-blue"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M8 7V5a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </span>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez votre mot de passe"
                    className="pl-10 pr-10 glass-dark border-glass-border focus:neon-glow-blue"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <span>
                        <svg className="w-4 h-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 8c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                    ) : (
                      <span>
                        <svg className="w-4 h-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 8c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full neon-glow-blue bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-pink transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            {userType === 'manager' && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                 Se connecter a votre espace!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-muted-foreground">
          MyResto-Gestion multi-restaurants
        </p>
      </div>
    </div>
  );
}
