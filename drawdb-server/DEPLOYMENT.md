# DrawDB Server Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Azure VM Deployment](#azure-vm-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** v18.x or higher
- **PostgreSQL** 14.x or higher (or Docker)
- **Docker & Docker Compose** (for containerized deployment)
- **Git**

### Azure VM Requirements
- **OS**: Ubuntu 20.04+ or similar
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **Network**: Port 9080 open for API access

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd drawdb-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Minimum required configuration:**
```env
NODE_ENV=development
PORT=9080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
CLIENT_URLS=http://localhost:3000
```

### 4. Setup PostgreSQL Database

**Option A: Using Docker**
```bash
docker run --name drawdb-postgres \
  -e POSTGRES_DB=drawdb \
  -e POSTGRES_USER=drawdb_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:14-alpine
```

**Option B: Using Local PostgreSQL**
```bash
# Create database and user
psql -U postgres
CREATE DATABASE drawdb;
CREATE USER drawdb_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE drawdb TO drawdb_user;
\q
```

### 5. Run Database Migrations
```bash
psql -U drawdb_user -d drawdb -f migrations/001_initial_schema.sql
```

### 6. Start Development Server
```bash
npm run dev
```

Server will start on http://localhost:9080

### 7. Verify Installation
```bash
curl http://localhost:9080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T...",
  "uptime": 1.234
}
```

---

## Docker Deployment

### 1. Prepare Environment File
```bash
cp env.example .env
# Edit .env with production values
```

**Production .env example:**
```env
NODE_ENV=production
PORT=9080
DB_HOST=postgres
DB_PORT=5432
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=<generate-secure-password>
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRES_IN=7d
CLIENT_URLS=https://yourdomain.com
```

### 2. Generate Secure Secrets
```bash
# Database password
openssl rand -base64 32

# JWT secret
openssl rand -base64 64
```

### 3. Build and Start Containers
```bash
# Build and start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

### 4. Initialize Database
The database schema will be automatically created from the SQL file in `migrations/` folder when the PostgreSQL container starts for the first time.

To manually run migrations:
```bash
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### 5. Verify Deployment
```bash
curl http://localhost:9080/health
```

### 6. View Logs
```bash
# All services
docker-compose logs -f

# API only
docker-compose logs -f api

# PostgreSQL only
docker-compose logs -f postgres
```

### 7. Stop Services
```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ DATA LOSS)
docker-compose down -v
```

---

## Azure VM Deployment

### Step 1: Prepare Azure VM

#### 1.1 Connect to VM
```bash
ssh azureuser@your-vm-ip
```

#### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.3 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

#### 1.4 Configure Firewall
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow API port
sudo ufw allow 9080/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 2: Deploy Application

#### 2.1 Create Application Directory
```bash
sudo mkdir -p /opt/drawdb
sudo chown $USER:$USER /opt/drawdb
cd /opt/drawdb
```

#### 2.2 Clone Repository
```bash
git clone <repository-url> .
```

#### 2.3 Create Production Environment File
```bash
cat > .env << EOF
NODE_ENV=production
PORT=9080
DB_HOST=postgres
DB_PORT=5432
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_URLS=https://yourdomain.com,https://www.yourdomain.com
EOF

# Secure the file
chmod 600 .env
```

#### 2.4 Deploy with Docker Compose
```bash
# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 2.5 Verify Deployment
```bash
# From within VM
curl http://localhost:9080/health

# From external machine
curl http://your-vm-ip:9080/health
```

### Step 3: Set Up Automated Backups

#### 3.1 Create Backup Script
```bash
sudo mkdir -p /opt/drawdb/backups

cat > /opt/drawdb/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/drawdb/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/drawdb_backup_$TIMESTAMP.sql"

# Create backup
docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/drawdb/backup.sh
```

#### 3.2 Schedule Daily Backups
```bash
# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/drawdb/backup.sh") | crontab -
```

#### 3.3 Test Backup
```bash
/opt/drawdb/backup.sh
ls -lh /opt/drawdb/backups/
```

### Step 4: Set Up Monitoring

#### 4.1 Install Monitoring Tools
```bash
sudo apt install -y htop iotop
```

#### 4.2 Create Health Check Script
```bash
cat > /opt/drawdb/healthcheck.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:9080/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✓ Service is healthy"
    exit 0
else
    echo "✗ Service is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x /opt/drawdb/healthcheck.sh
```

#### 4.3 Set Up Log Rotation
```bash
sudo tee /etc/logrotate.d/drawdb << EOF
/opt/drawdb/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
}
EOF
```

### Step 5: SSL/HTTPS Setup (Recommended)

#### 5.1 Install Nginx
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 5.2 Configure Nginx as Reverse Proxy
```bash
sudo tee /etc/nginx/sites-available/drawdb << EOF
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:9080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/drawdb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5.3 Get SSL Certificate
```bash
sudo certbot --nginx -d api.yourdomain.com
```

#### 5.4 Update Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Step 6: Set Up Auto-Restart on Reboot
```bash
# Docker containers are already configured with restart: unless-stopped
# Verify configuration
docker-compose ps

# Test by rebooting
sudo reboot

# After reboot, check services
docker-compose ps
```

---

## Post-Deployment

### 1. Test API Endpoints

#### Register a User
```bash
curl -X POST http://your-vm-ip:9080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

#### Login
```bash
curl -X POST http://your-vm-ip:9080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the returned token for subsequent requests.

#### Create a Diagram
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://your-vm-ip:9080/api/v1/diagrams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Diagram",
    "database": "postgresql",
    "tables": [],
    "references": []
  }'
```

### 2. Monitor Performance
```bash
# View resource usage
docker stats

# View logs
docker-compose logs -f --tail=100

# Check database size
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "\l+"
```

### 3. Database Maintenance

#### Backup Database
```bash
docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > backup.sql
```

#### Restore Database
```bash
cat backup.sql | docker exec -i drawdb-postgres psql -U drawdb_user -d drawdb
```

#### Access Database Console
```bash
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb
```

---

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs api
docker-compose logs postgres

# Verify environment variables
docker-compose config

# Restart services
docker-compose restart
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection from API container
docker exec drawdb-api ping postgres

# Test database connection
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port 9080
sudo lsof -i :9080

# Stop the process
sudo kill -9 <PID>

# Or change port in .env and docker-compose.yml
```

### API Returns 500 Errors
```bash
# Check API logs
docker-compose logs -f api

# Check if database is accessible
docker exec drawdb-api ping postgres

# Verify environment variables
docker exec drawdb-api env | grep DB_
```

### High Memory Usage
```bash
# Check resource usage
docker stats

# Restart services
docker-compose restart

# Prune unused Docker resources
docker system prune -a
```

### Database Migration Issues
```bash
# Drop and recreate database
docker exec drawdb-postgres psql -U drawdb_user -c "DROP DATABASE drawdb;"
docker exec drawdb-postgres psql -U drawdb_user -c "CREATE DATABASE drawdb;"

# Rerun migrations
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

---

## Maintenance Commands

### Update Application
```bash
cd /opt/drawdb
git pull
docker-compose build
docker-compose up -d
```

### View Logs
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f api
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
```

### Scale for More Users
```bash
# Update docker-compose.yml to add multiple API instances
# Then rebuild
docker-compose up -d --scale api=3
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (64+ characters)
- [ ] Enable firewall (only ports 22, 80, 443, 9080)
- [ ] Set up SSL/HTTPS
- [ ] Configure CORS properly
- [ ] Enable automated backups
- [ ] Set up log rotation
- [ ] Keep system and Docker updated
- [ ] Use non-root user in containers
- [ ] Secure .env file (chmod 600)
- [ ] Monitor logs regularly
- [ ] Set up intrusion detection (optional)

---

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review this documentation
3. Check GitHub issues
4. Contact support team

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0

