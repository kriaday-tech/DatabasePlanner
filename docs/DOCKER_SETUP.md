# 🐳 Docker Setup Guide for DrawDB

Complete guide to run the entire DrawDB application stack using Docker.

---

## 📋 Prerequisites

- **Docker** installed (v20.10+)
- **Docker Compose** installed (v2.0+)
- **8GB RAM** minimum (recommended for all services)
- **10GB free disk space**

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create Environment File

Create a `.env` file in the project root:

```bash
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
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** database on port `5432`
- **Backend API** on port `9080`
- **Frontend** on port `3000`

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────────┐
│   Frontend (Nginx)                  │
│   http://localhost:3000             │
│   Container: drawdb-frontend        │
└─────────────┬───────────────────────┘
              │
              │ API Calls
              ▼
┌─────────────────────────────────────┐
│   Backend API (Node.js/Express)     │
│   http://localhost:9080             │
│   Container: drawdb-backend         │
└─────────────┬───────────────────────┘
              │
              │ Database Queries
              ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│   Port: 5432                        │
│   Container: drawdb-postgres        │
└─────────────────────────────────────┘
```

---

## 🔧 Detailed Configuration

### Environment Variables

Create `.env` file with these variables:

#### Database Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_NAME` | `drawdb` | PostgreSQL database name |
| `DB_USER` | `drawdb_user` | PostgreSQL username |
| `DB_PASSWORD` | `changeme123` | PostgreSQL password (⚠️ CHANGE IN PRODUCTION!) |

#### Backend Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `JWT_SECRET` | - | JWT signing secret (⚠️ REQUIRED!) |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration |
| `BCRYPT_ROUNDS` | `10` | Password hashing rounds |
| `CLIENT_URLS` | - | CORS allowed origins |

#### Frontend Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:9080` | Backend API URL |

---

## 🎯 Common Commands

### Start All Services
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Check Service Status
```bash
docker-compose ps
```

### Stop All Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild and Restart
```bash
docker-compose up -d --build
```

### Stop and Remove Everything (⚠️ DATA LOSS)
```bash
docker-compose down -v
```

---

## 🔍 Health Checks

### Check Backend API
```bash
curl http://localhost:9080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T...",
  "uptime": 123.456
}
```

### Check Frontend
```bash
curl http://localhost:3000
```

Should return HTML content.

### Check Database
```bash
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb -c "SELECT 1;"
```

Expected output:
```
 ?column? 
----------
        1
```

---

## 🧪 Testing the Setup

### 1. Register a User
```bash
curl -X POST http://localhost:9080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:9080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `token` from the response.

### 3. Create a Diagram
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:9080/api/v1/diagrams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Diagram",
    "database": "postgresql",
    "tables": [],
    "references": []
  }'
```

---

## 📁 Database Management

### Backup Database
```bash
docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup_20260102.sql | docker exec -i drawdb-postgres psql -U drawdb_user -d drawdb
```

### Access Database Console
```bash
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb
```

Common queries:
```sql
-- List all tables
\dt

-- Count users
SELECT COUNT(*) FROM users;

-- Count diagrams
SELECT COUNT(*) FROM diagrams;

-- View recent diagrams
SELECT id, name, created_at FROM diagrams ORDER BY created_at DESC LIMIT 10;

-- Exit
\q
```

---

## 🔒 Production Security

### Generate Secure Secrets

#### Database Password
```bash
openssl rand -base64 32
```

#### JWT Secret
```bash
openssl rand -base64 64
```

### Production .env Example
```bash
# Database (Strong Password)
DB_PASSWORD=x8K9mP2nQ7vR4sT6uW1yZ3aB5cD8eF0gH1iJ4kL7mN0pQ3rS6tU9vW2xY5zA

# Backend (Secure JWT Secret)
JWT_SECRET=aB3dE6fG9hJ2kL5mN8pQ1rS4tU7vW0xY3zA6bC9dE2fG5hJ8kL1mN4pQ7rS0tU3vWxYz

# CORS (Your Domain)
CLIENT_URLS=https://drawdb.yourdomain.com

# Frontend (Your API Domain)
VITE_BACKEND_URL=https://api.yourdomain.com
```

---

## 🐛 Troubleshooting

### Services Won't Start

**Problem:** Port already in use
```bash
# Check what's using the port
lsof -i :3000    # Frontend
lsof -i :9080    # Backend
lsof -i :5432    # Database

# Kill the process or change ports in docker-compose.yml
```

**Problem:** Database connection failed
```bash
# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check database is healthy
docker-compose ps postgres
```

### Frontend Can't Connect to Backend

**Problem:** CORS errors in browser console

**Solution:** 
1. Check `CLIENT_URLS` in `.env` includes frontend URL
2. Restart backend: `docker-compose restart backend`
3. Clear browser cache

### Database Migration Failed

**Problem:** Tables not created

**Solution:**
```bash
# Stop all services
docker-compose down -v

# Start services (will run migrations)
docker-compose up -d

# Or manually run migration
docker cp drawdb-server/migrations/001_initial_schema.sql drawdb-postgres:/tmp/
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -f /tmp/001_initial_schema.sql
```

### Container Keeps Restarting

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Database not ready (wait 30 seconds)
- Invalid environment variables
- Missing JWT_SECRET

---

## 📈 Monitoring

### View Resource Usage
```bash
docker stats
```

### Check Container Health
```bash
docker-compose ps
```

All services should show status `healthy` or `Up`.

### View Network
```bash
docker network inspect databaseassistant_drawdb-network
```

---

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Update Dependencies Only
```bash
# Backend
docker-compose exec backend npm update

# Frontend (requires rebuild)
docker-compose up -d --build frontend
```

### Clean Up Unused Resources
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ CAREFUL!)
docker volume prune
```

---

## 🌐 Custom Domain Setup

### 1. Update Environment Variables
```bash
# .env
CLIENT_URLS=https://drawdb.yourdomain.com
VITE_BACKEND_URL=https://api.yourdomain.com
```

### 2. Set Up Nginx Reverse Proxy

Create `/etc/nginx/sites-available/drawdb`:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:9080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name drawdb.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 3. Get SSL Certificates
```bash
sudo certbot --nginx -d api.yourdomain.com -d drawdb.yourdomain.com
```

### 4. Rebuild with New URLs
```bash
docker-compose up -d --build
```

---

## 📝 Development Mode

For development with hot-reload:

### Backend Development
```bash
cd drawdb-server
npm run dev
```

### Frontend Development
```bash
cd drawdb
npm run dev
```

### Database Only (Docker)
```bash
docker-compose up -d postgres
```

---

## ✅ Verification Checklist

- [ ] All three containers are running: `docker-compose ps`
- [ ] Backend health check passes: `curl http://localhost:9080/health`
- [ ] Frontend is accessible: `http://localhost:3000`
- [ ] Can register a new user via UI
- [ ] Can login and access editor
- [ ] Can create and save diagrams
- [ ] Diagrams persist after browser refresh
- [ ] No CORS errors in browser console

---

## 🆘 Support

If you encounter issues:

1. **Check logs:** `docker-compose logs -f`
2. **Check health:** `docker-compose ps`
3. **Restart services:** `docker-compose restart`
4. **Clean restart:** `docker-compose down && docker-compose up -d`

For persistent issues, check:
- Docker version: `docker --version`
- Docker Compose version: `docker-compose --version`
- Available disk space: `df -h`
- Available memory: `free -h`

---

**Last Updated:** January 2, 2026  
**Docker Compose Version:** 3.8  
**Tested On:** Docker 24.0+, Docker Compose 2.0+


