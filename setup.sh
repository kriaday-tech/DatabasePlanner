#!/bin/bash

# Database Assistant Setup Script
# This script helps you set up the application for the first time

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Database Assistant - Setup Script                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"
echo ""

# Generate secure random strings
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "\n"
}

# Setup Backend Environment
echo "Setting up backend environment..."
BACKEND_ENV_FILE="drawdb-server/.env"

if [ -f "$BACKEND_ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ Backend .env file already exists. Skipping...${NC}"
else
    echo "Creating backend .env file..."
    
    # Generate secure values
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_jwt_secret)
    
    cat > "$BACKEND_ENV_FILE" << EOF
# Server Configuration
NODE_ENV=production
PORT=9080

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=${DB_PASSWORD}

# Authentication Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# CORS Configuration
CLIENT_URLS=http://localhost:3000

# Optional: Email Configuration
# MAIL_SERVICE=gmail
# MAIL_USERNAME=your_email@gmail.com
# MAIL_PASSWORD=your_app_password

# Optional: GitHub Integration
# GITHUB_TOKEN=your_github_token
EOF
    
    echo -e "${GREEN}✓ Backend .env file created with secure random values${NC}"
fi
echo ""

# Setup Frontend Environment
echo "Setting up frontend environment..."
FRONTEND_ENV_FILE="drawdb/.env"

if [ -f "$FRONTEND_ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ Frontend .env file already exists. Skipping...${NC}"
else
    echo "Creating frontend .env file..."
    
    cat > "$FRONTEND_ENV_FILE" << EOF
# Backend API URL
VITE_API_URL=http://localhost:9080
EOF
    
    echo -e "${GREEN}✓ Frontend .env file created${NC}"
fi
echo ""

# Update docker-compose.yml with generated password
echo "Updating docker-compose.yml with database password..."
if [ -f "$BACKEND_ENV_FILE" ]; then
    DB_PASSWORD=$(grep "DB_PASSWORD=" "$BACKEND_ENV_FILE" | cut -d'=' -f2)
    
    # Create a backup of docker-compose.yml
    cp docker-compose.yml docker-compose.yml.backup
    
    # Update the postgres password in docker-compose.yml
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/POSTGRES_PASSWORD:.*/POSTGRES_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
    else
        # Linux
        sed -i "s/POSTGRES_PASSWORD:.*/POSTGRES_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
    fi
    
    echo -e "${GREEN}✓ docker-compose.yml updated${NC}"
fi
echo ""

# Ask if user wants to start the application
echo "════════════════════════════════════════════════════════════"
echo "Setup completed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Configuration files created:"
echo "  • drawdb-server/.env"
echo "  • drawdb/.env"
echo "  • docker-compose.yml (updated)"
echo ""
echo "Next steps:"
echo "  1. Review the .env files if you need to customize settings"
echo "  2. Start the application with: docker-compose up -d --build"
echo "  3. Access the application at: http://localhost:3000"
echo ""

read -p "Would you like to start the application now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Building and starting the application..."
    echo "This may take a few minutes on the first run..."
    echo ""
    
    docker-compose up -d --build
    
    echo ""
    echo -e "${GREEN}✓ Application started successfully!${NC}"
    echo ""
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    echo ""
    echo "Service Status:"
    docker-compose ps
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  🎉 Application is ready!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Frontend:  http://localhost:3000"
    echo "  Backend:   http://localhost:9080"
    echo "  Health:    http://localhost:9080/health"
    echo ""
    echo "  View logs: docker-compose logs -f"
    echo "  Stop:      docker-compose down"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
else
    echo ""
    echo "You can start the application later with:"
    echo "  docker-compose up -d --build"
    echo ""
fi



