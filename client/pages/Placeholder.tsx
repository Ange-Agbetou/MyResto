// ...existing code...
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface PlaceholderProps {
  title: string;
  description: string;
  backLink: string;
  backText: string;
}

export default function Placeholder({ title, description, backLink, backText }: PlaceholderProps) {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <Card className="glass border-glass-border max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-neon-purple to-neon-pink rounded-full flex items-center justify-center neon-glow-purple mb-4">
            {/* <ConstructionIcon className="w-8 h-8 text-white" /> */}
          </div>
          <CardTitle className="text-xl bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            {description}
          </p>
          <p className="text-sm text-muted-foreground">
            Cette page sera bientôt disponible. Continuez à demander des améliorations pour compléter cette fonctionnalité.
          </p>
          <Link to={backLink}>
            <Button className="neon-glow-blue bg-gradient-to-r from-neon-blue to-neon-purple">
              {/* <ArrowLeftIcon className="w-4 h-4 mr-2" /> */}
              {backText}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
