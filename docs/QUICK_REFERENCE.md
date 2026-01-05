# Quick Reference Guide

Quick commands and tips for Database Assistant.

## 🚀 Getting Started

```bash
# First time setup (interactive)
./setup.sh

# Or manual setup
cp drawdb-server/env.example drawdb-server/.env
# Edit drawdb-server/.env with your values
docker-compose up -d --build
```

## 🔄 Common Commands

### Starting and Stopping

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs --tail=50 backend
```

### Service Management

```bash
# View running containers
docker-compose ps

# Restart a service
docker-compose restart backend
docker-compose restart frontend

# Rebuild a specific service
docker-compose up -d --build frontend
```

## 🗄️ Database Commands

### Access Database

```bash
# Connect to PostgreSQL
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb

# Inside psql:
\dt              # List tables
\d+ diagrams     # Describe diagrams table
\q               # Quit
```

### Backup and Restore

```bash
# Backup
docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > backup.sql

# Restore
docker exec -i drawdb-postgres psql -U drawdb_user drawdb < backup.sql
```

### Database Queries

```bash
# Count diagrams
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "SELECT COUNT(*) FROM diagrams;"

# List users
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "SELECT id, email, username FROM users;"

# View all diagrams
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "SELECT id, name, owner_id, created_at FROM diagrams;"
```

## 🐛 Debugging

### Check Service Health

```bash
# Backend health check
curl http://localhost:9080/health

# Frontend
curl http://localhost:3000

# Check if ports are in use
lsof -ti:3000    # Frontend port
lsof -ti:9080    # Backend port
lsof -ti:5432    # PostgreSQL port
```

### Service Status

```bash
# Check all container statuses
docker-compose ps

# Check specific container health
docker inspect drawdb-backend --format='{{.State.Health.Status}}'
docker inspect drawdb-postgres --format='{{.State.Health.Status}}'
```

### Clean Restart

```bash
# Complete clean restart
docker-compose down -v
docker-compose up -d --build

# Clear Docker cache and rebuild
docker-compose down --rmi all -v
docker-compose up -d --build
```

## 📝 Development Tips

### Environment Variables

```bash
# Backend (.env location)
drawdb-server/.env

# Frontend (.env location)
drawdb/.env

# Check if environment variables are loaded
docker exec drawdb-backend printenv | grep DB_
```

### Hot Reload Development

```bash
# Run backend in dev mode (outside Docker)
cd drawdb-server
npm install
npm run dev

# Run frontend in dev mode (outside Docker)
cd drawdb
npm install
npm run dev
```

## 🔐 Security

### Generate Secure Values

```bash
# Database password
openssl rand -base64 32

# JWT secret
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Reset Admin Password

```bash
# Connect to database
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb

# Update user password (example)
# Note: Password should be bcrypt hashed in real scenario
UPDATE users SET password = 'new_hashed_password' WHERE email = 'admin@example.com';
```

## 📊 Monitoring

### Resource Usage

```bash
# Container stats
docker stats

# Specific container
docker stats drawdb-backend

# Disk usage
docker system df
```

### Database Size

```bash
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "
  SELECT 
    pg_size_pretty(pg_database_size('drawdb')) as database_size;
"
```

## 🧹 Cleanup

### Remove Unused Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

## 📱 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:9080 | API endpoints |
| Health Check | http://localhost:9080/health | Service health |
| API Docs | http://localhost:9080/api/v1 | API documentation |

## 🆘 Quick Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs backend

# Check if port is in use
lsof -ti:9080 | xargs kill -9

# Restart service
docker-compose restart backend
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify credentials in .env
cat drawdb-server/.env | grep DB_
```

### Frontend Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:9080/health

# Check frontend environment
cat drawdb/.env

# Check CORS settings in backend .env
```

## 📦 Ports Reference

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Frontend | React application |
| 9080 | Backend | Node.js API |
| 5432 | PostgreSQL | Database |

## 🔄 Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or use the start script
./start.sh
```

## 💡 Tips

1. **Always use `docker-compose logs -f`** to monitor application startup
2. **Keep your `.env` files secure** - never commit them to git
3. **Backup your database regularly** using pg_dump
4. **Use `docker-compose down -v`** only when you want to delete all data
5. **Check health endpoint** before debugging: http://localhost:9080/health

## 📚 Additional Resources

- [Full README](README.md) - Complete documentation
- [Backend README](drawdb-server/README.md) - Backend-specific docs
- [Frontend README](drawdb/README.md) - Frontend-specific docs
- [Docker Setup Guide](DOCKER_SETUP.md) - Detailed Docker configuration

