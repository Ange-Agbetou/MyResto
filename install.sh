#!/bin/bash

# Script d'installation automatique Restaurant Pro
# Usage: ./install.sh

set -e

echo "🍽️  Installation de Restaurant Pro"
echo "=================================="

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "📥 Installez Node.js 18+ depuis https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION détectée"
    echo "📥 Veuillez installer Node.js 18 ou plus récent"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"

# Installer pnpm si nécessaire
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installation de pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm $(pnpm -v) prêt"

# Installer les dépendances
echo "📦 Installation des dépendances..."
pnpm install

# Vérifier la configuration de base de données
if [ ! -f ".env" ]; then
    echo "⚙️  Création du fichier de configuration..."
    cp .env.example .env
    echo "📝 Veuillez éditer le fichier .env avec vos paramètres de base de données"
fi

# Demander le type de base de données
echo ""
echo "🗄️  Configuration de la base de données"
echo "1) MySQL (recommandé)"
echo "2) PostgreSQL"
read -p "Choisissez votre base de données (1 ou 2): " db_choice

case $db_choice in
    1)
        DB_TYPE="mysql"
        DB_PORT="3306"
        echo "✅ MySQL sélectionné"
        ;;
    2)
        DB_TYPE="postgresql"
        DB_PORT="5432"
        echo "✅ PostgreSQL sélectionné"
        ;;
    *)
        echo "❌ Choix invalide, MySQL par défaut"
        DB_TYPE="mysql"
        DB_PORT="3306"
        ;;
esac

# Demander les paramètres de connexion
read -p "Host de la base de données (localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Port de la base de données ($DB_PORT): " INPUT_PORT
DB_PORT=${INPUT_PORT:-$DB_PORT}

read -p "Nom de la base de données (restaurant_pro): " DB_NAME
DB_NAME=${DB_NAME:-restaurant_pro}

read -p "Utilisateur de la base de données (restaurant_user): " DB_USER
DB_USER=${DB_USER:-restaurant_user}

read -s -p "Mot de passe de la base de données: " DB_PASSWORD
echo ""

# Mettre à jour le fichier .env
cat > .env << EOF
# Configuration Restaurant Pro - Généré automatiquement

# Base de données
DB_TYPE=$DB_TYPE
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SSL=false

# JWT
JWT_SECRET=restaurant-pro-$(openssl rand -hex 32)
JWT_EXPIRES_IN=24h

# Serveur
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8080

# CORS
CORS_ORIGIN=http://localhost:8080

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "✅ Configuration sauvegardée"

# Tester la connexion et créer la base si nécessaire
echo ""
echo "🔗 Test de connexion à la base de données..."

if [ "$DB_TYPE" = "mysql" ]; then
    # Test MySQL
    if command -v mysql &> /dev/null; then
        echo "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" 2>/dev/null || {
            echo "⚠️  Impossible de créer la base automatiquement"
            echo "📝 Créez manuellement la base avec :"
            echo "   CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        }
    else
        echo "⚠️  Client MySQL non trouvé, création manuelle requise"
    fi
elif [ "$DB_TYPE" = "postgresql" ]; then
    # Test PostgreSQL
    if command -v psql &> /dev/null; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
            echo "⚠️  Impossible de créer la base automatiquement"
            echo "📝 Créez manuellement la base avec :"
            echo "   CREATE DATABASE $DB_NAME;"
        }
    else
        echo "⚠️  Client PostgreSQL non trouvé, création manuelle requise"
    fi
fi

# Build de l'application
echo ""
echo "🔨 Construction de l'application..."
pnpm build

echo ""
echo "🎉 Installation terminée avec succès !"
echo ""
echo "🚀 Pour démarrer l'application :"
echo "   pnpm dev              # Mode développement"
echo "   pnpm start            # Mode production"
echo ""
echo "🌐 L'application sera accessible sur :"
echo "   http://localhost:8080"
echo ""
echo "👤 Comptes de test :"
echo "   Propriétaire : proprietaire / owner123"
echo "   Gérant       : gerant1 / manager123"
echo ""
echo "📖 Consultez README.md pour plus d'informations"
