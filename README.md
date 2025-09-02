# 🍽️ Restaurant Pro - Système de Gestion Futuriste

![Restaurant Pro](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

Application complète de gestion multi-restaurants avec interface futuriste, authentification sécurisée, gestion des stocks automatique et rapports détaillés.

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité
- **JWT sécurisé** avec expiration et gestion des sessions
- **Contrôle d'accès par rôles** (Propriétaire/Gérant)
- **Rate limiting** pour protéger l'API
- **Hashage des mots de passe** avec bcrypt

### 🏪 Gestion Multi-Restaurants
- **Tableau de bord propriétaire** avec vue globale
- **Statistiques en temps réel** par restaurant
- **Gestion des gérants** par restaurant
- **Suivi des performances** comparatives

### 📋 Prise de Commandes Avancée
- **Interface gérant intuitive** pour saisie rapide
- **Gestion plats et boissons** avec catégorisation
- **Calcul automatique** des totaux et taxes
- **Modes de paiement** (Espèces/Électronique)

### 📊 Gestion Intelligente des Stocks
- **Décrément automatique** lors des ventes
- **Alertes de stock bas** en temps réel
- **Historique des mouvements** complet
- **Ravitaillement** avec traçabilité

### 📈 Rapports & Analytics
- **Rapports journaliers détaillés** par restaurant
- **Export PDF** avec mise en forme professionnelle
- **Rapport consolidé** multi-restaurants
- **Séparation paiements** espèces vs électronique

### 🎨 Interface Futuriste
- **Design glassmorphism** avec effets de transparence
- **Thème sombre** avec accents néon
- **Animations fluides** et transitions
- **Responsive design** sur tous écrans

## 🚀 Installation Rapide

### Prérequis
- **Node.js** 18+ et **npm**/**pnpm**
- **MySQL** 8.0+ ou **PostgreSQL** 12+
- **Git** pour cloner le projet

### 1. Cloner le Projet
```bash
git clone <repository-url>
cd restaurant-pro
```

### 2. Installer les Dépendances
```bash
# Avec pnpm (recommandé)
pnpm install

# Ou avec npm
npm install
```

### 3. Configuration Base de Données

#### Option A: MySQL (Recommandé)
```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base et l'utilisateur
CREATE DATABASE restaurant_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'restaurant_user'@'localhost' IDENTIFIED BY 'restaurant_password';
GRANT ALL PRIVILEGES ON restaurant_pro.* TO 'restaurant_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Option B: PostgreSQL
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base et l'utilisateur
CREATE DATABASE restaurant_pro;
CREATE USER restaurant_user WITH PASSWORD 'restaurant_password';
GRANT ALL PRIVILEGES ON DATABASE restaurant_pro TO restaurant_user;
\q
```

### 4. Configuration Environnement
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer la configuration (adapter selon votre setup)
# DB_TYPE=mysql (ou postgresql)
# DB_HOST=localhost
# DB_PORT=3306 (ou 5432 pour PostgreSQL)
# DB_USER=restaurant_user
# DB_PASSWORD=restaurant_password
# DB_NAME=restaurant_pro
```

### 5. Lancer l'Application
```bash
# Mode développement
pnpm dev

# Ou en production
pnpm build
pnpm start
```

L'application sera accessible sur **http://localhost:8080**

## 👤 Comptes de Test

Une fois l'application démarrée, vous pouvez vous connecter avec :

### Propriétaire
- **Utilisateur**: `proprietaire`
- **Mot de passe**: `owner123`
- **Accès**: Gestion complète, création gérants, rapports consolidés

### Gérant
- **Utilisateur**: `gerant1`
- **Mot de passe**: `manager123`
- **Accès**: Prise de commandes, consultation stocks

## 📁 Structure du Projet

```
restaurant-pro/
├── client/                 # Frontend React
│   ├── components/ui/      # Composants UI réutilisables
│   ├── pages/             # Pages de l'application
│   ├── lib/               # Utilitaires et API client
│   └── global.css         # Styles globaux et thème
├── server/                # Backend Express
│   ├── config/            # Configuration base de données
│   ├── routes/            # Routes API
│   ├── migrations/        # Migrations de base de données
│   └── index.ts           # Point d'entrée serveur
├── shared/                # Types partagés
└── docs/                  # Documentation
```

## 🔧 Configuration Avancée

### Variables d'Environnement
```bash
# Base de données
DB_TYPE=mysql|postgresql
DB_HOST=localhost
DB_PORT=3306|5432
DB_USER=restaurant_user
DB_PASSWORD=restaurant_password
DB_NAME=restaurant_pro
DB_SSL=false

# JWT & Sécurité
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Serveur
NODE_ENV=development|production
PORT=3001
FRONTEND_URL=http://localhost:8080

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# CORS
CORS_ORIGIN=http://localhost:8080
```

### Scripts Disponibles
```bash
pnpm dev          # Développement avec hot reload
pnpm build        # Build de production
pnpm start        # Démarrage production
pnpm typecheck    # Vérification TypeScript
pnpm migrate      # Lancer les migrations manuellement
```

## 🎯 Utilisation

### 1. Connexion Propriétaire
1. Accédez à l'application
2. Sélectionnez "Propriétaire"
3. Connectez-vous avec `proprietaire` / `owner123`
4. Accédez au tableau de bord multi-restaurants

### 2. Création de Gérants
1. Dans le tableau de bord propriétaire
2. Cliquez sur "Gérer les Gérants"
3. Créez des comptes pour vos gérants
4. Assignez-les à un restaurant spécifique

### 3. Prise de Commandes
1. Connectez-vous en tant que gérant
2. Saisissez les plats et boissons
3. Sélectionnez le mode de paiement
4. Confirmez la commande

### 4. Gestion des Stocks
1. Les stocks de boissons se décrémènt automatiquement
2. Consultez les alertes de stock bas
3. Ravitaillez via l'interface propriétaire

### 5. Rapports
1. Consultez les rapports journaliers
2. Exportez en PDF pour impression
3. Analysez les tendances par restaurant

## 🔒 Sécurité

### Fonctionnalités Implémentées
- **JWT** avec expiration automatique
- **Hashage bcrypt** des mots de passe
- **Rate limiting** anti-spam
- **Validation des entrées** côté serveur
- **Contrôle d'accès** par rôles
- **Protection CORS** configurée

### Recommandations Production
```bash
# Changez le secret JWT
JWT_SECRET=your-production-secret-very-long-and-random

# Configurez SSL en production
DB_SSL=true

# Limitez les domaines CORS
CORS_ORIGIN=https://your-domain.com

# Utilisez un reverse proxy (nginx)
# Configurez HTTPS avec certificats SSL
```

## 📊 Base de Données

### Schéma Principal
- **users** - Utilisateurs (propriétaires/gérants)
- **restaurants** - Restaurants
- **products** - Produits (plats/boissons)
- **stocks** - Gestion des stocks
- **orders** - Commandes
- **order_items** - Articles des commandes
- **stock_movements** - Historique des mouvements

### Migrations Automatiques
Les migrations s'exécutent automatiquement au démarrage. En cas de problème :
```bash
# Relancer les migrations manuellement
node -e "import('./server/migrations/migrator.js').then(m => m.migrator.runMigrations())"
```

## 🐛 Dépannage

### Problèmes Courants

#### Erreur de Connexion Base de Données
```bash
# Vérifier que MySQL/PostgreSQL fonctionne
sudo systemctl status mysql
# ou
sudo systemctl status postgresql

# Vérifier les credentials dans .env
# Tester la connexion manuellement
```

#### Port Déjà Utilisé
```bash
# Changer le port dans .env
PORT=3002

# Ou tuer le processus
sudo lsof -ti:3001 | xargs kill -9
```

#### Erreur de Migration
```bash
# Vérifier les logs du serveur
# S'assurer que l'utilisateur DB a les bonnes permissions
# Relancer les migrations manuellement
```

## 🚀 Déploiement Production

### Option 1: Serveur Dédié (Ubuntu/CentOS)
```bash
# 1. Cloner sur le serveur
git clone <repository-url>
cd restaurant-pro

# 2. Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Installer pnpm
npm install -g pnpm

# 4. Installer les dépendances
pnpm install --prod

# 5. Configurer .env pour production
cp .env.example .env
# Éditer avec vos valeurs de production

# 6. Builder l'application
pnpm build

# 7. Utiliser PM2 pour la production
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Option 2: Docker
```dockerfile
# Créer un Dockerfile pour containerisation
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --prod
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Option 3: Services Cloud
- **AWS EC2** avec RDS MySQL
- **Google Cloud Run** avec Cloud SQL
- **DigitalOcean Droplet** avec Managed Database
- **Heroku** avec JawsDB MySQL

## 📞 Support

### Documentation
- [Installation Détaillée](docs/installation.md)
- [Guide API](docs/api.md)
- [Personnalisation](docs/customization.md)
- [FAQ](docs/faq.md)

### Contribution
1. Fork le projet
2. Créez une branche feature
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

**Restaurant Pro** - Développé avec ❤️ pour une gestion de restaurant moderne et efficace.

🌟 **N'hésitez pas à star le projet si vous le trouvez utile !**
