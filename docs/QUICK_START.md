# 🚀 DrawDB - Quick Start with Docker

Get up and running in 3 commands!

---

## ⚡ Super Quick Start

```bash
# 1. Run the startup script
./start.sh

# That's it! Access the app at http://localhost:3000
```

---

## 📋 Manual Quick Start

```bash
# 1. Create .env file
cat > .env << 'EOF'
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=changeme123
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_URLS=http://localhost:3000,http://localhost:5173
VITE_BACKEND_URL=http://localhost:9080
EOF

# 2. Start services
docker-compose up -d

# 3. Open browser
open http://localhost:3000
```

---

## 🎯 What's Running?

| Service | URL | Port |
|---------|-----|------|
| **Frontend** (UI) | http://localhost:3000 | 3000 |
| **Backend** (API) | http://localhost:9080 | 9080 |
| **Database** (PostgreSQL) | localhost:5432 | 5432 |

---

## 🔧 Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Rebuild and restart
docker-compose up -d --build
```

---

## ✅ Testing the Application

### Via Web UI
1. Open http://localhost:3000
2. Click "Register" or go to http://localhost:3000/login
3. Create an account
4. Start creating diagrams!

### Via API (cURL)

**Register User:**
```bash
curl -X POST http://localhost:9080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!"}'
```

**Login:**
```bash
curl -X POST http://localhost:9080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 🐛 Troubleshooting

**Problem:** Services won't start
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :9080
lsof -i :5432

# Or change ports in docker-compose.yml
```

**Problem:** Can't connect to backend
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

**Problem:** Database connection failed
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

---

## 🔒 Production Security

**Before deploying to production:**

1. **Generate secure password:**
   ```bash
   openssl rand -base64 32
   ```

2. **Generate JWT secret:**
   ```bash
   openssl rand -base64 64
   ```

3. **Update .env with these values**

4. **Update CORS origins:**
   ```
   CLIENT_URLS=https://yourdomain.com
   VITE_BACKEND_URL=https://api.yourdomain.com
   ```

---

## 📚 Documentation

- **Complete Setup Guide:** [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Frontend Config:** [drawdb/README.md](drawdb/README.md)
- **Backend Config:** [drawdb-server/README.md](drawdb-server/README.md)
- **Implementation Plan:** [drawdb-server/plan.md](drawdb-server/plan.md)

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Check service status: `docker-compose ps`
3. Read detailed guide: [DOCKER_SETUP.md](DOCKER_SETUP.md)
4. Clean restart: `docker-compose down && docker-compose up -d`

---

**🎉 Happy Diagramming!**


