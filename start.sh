#!/bin/bash

# DrawDB Docker Startup Script
# This script helps you quickly start the entire DrawDB application stack

set -e

echo "🐳 DrawDB Docker Startup"
echo "========================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cat > .env << 'EOF'
# Database Configuration
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=changeme123

# Backend API Configuration
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_URLS=http://localhost:3000,http://localhost:5173

# Frontend Configuration
VITE_BACKEND_URL=http://localhost:9080
EOF
    echo "✅ Created .env file with default values"
    echo ""
    echo "⚠️  WARNING: Please update the following in .env for production:"
    echo "   - DB_PASSWORD (use: openssl rand -base64 32)"
    echo "   - JWT_SECRET (use: openssl rand -base64 64)"
    echo ""
fi

# Ask user if they want to proceed
read -p "🚀 Start all services? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "📦 Starting services..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for services to be healthy
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔍 Health Checks:"
echo ""

# Check backend health
echo -n "Backend API: "
if curl -s http://localhost:9080/health > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "⚠️  Not responding yet (may need a few more seconds)"
fi

# Check frontend
echo -n "Frontend: "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "⚠️  Not responding yet (may need a few more seconds)"
fi

# Check database
echo -n "Database: "
if docker exec drawdb-postgres pg_isready -U drawdb_user > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "⚠️  Not ready yet"
fi

echo ""
echo "✨ DrawDB is starting up!"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:9080"
echo "   API Docs:  http://localhost:9080/health"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "For more information, see DOCKER_SETUP.md"
echo ""



