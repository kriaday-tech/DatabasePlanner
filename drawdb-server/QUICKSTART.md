# DrawDB Server - Quick Start Guide

## 🚀 Quick Start with Docker

The fastest way to get started is using Docker Compose:

### 1. Setup Environment
```bash
# Create .env file from example
cp env.example .env

# Edit .env and set at minimum:
# - DB_PASSWORD (generate with: openssl rand -base64 32)
# - JWT_SECRET (generate with: openssl rand -base64 64)
```

### 2. Start Services
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Verify Installation
```bash
# Check health endpoint
curl http://localhost:9080/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## 📝 Testing the API

### Register a New User
```bash
curl -X POST http://localhost:9080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the returned `token` for subsequent requests.

### Login
```bash
curl -X POST http://localhost:9080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Create a Diagram
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:9080/api/v1/diagrams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My First Diagram",
    "database": "postgresql",
    "tables": [],
    "references": [],
    "notes": [],
    "areas": [],
    "todos": []
  }'
```

### Get All Diagrams
```bash
curl http://localhost:9080/api/v1/diagrams \
  -H "Authorization: Bearer $TOKEN"
```

### Share a Diagram
```bash
DIAGRAM_ID="diagram-uuid"
USER_ID="user-uuid-to-share-with"

curl -X POST http://localhost:9080/api/v1/diagrams/$DIAGRAM_ID/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "'$USER_ID'",
    "permissionLevel": "editor"
  }'
```

---

## 🛠️ Development Setup

### Without Docker

1. **Install Dependencies**
```bash
npm install
```

2. **Setup PostgreSQL**
```bash
# Using Docker
docker run --name drawdb-postgres \
  -e POSTGRES_DB=drawdb \
  -e POSTGRES_USER=drawdb_user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:14-alpine

# Or use local PostgreSQL
createdb drawdb
createuser drawdb_user
```

3. **Run Migrations**
```bash
psql -U drawdb_user -d drawdb -f migrations/001_initial_schema.sql
```

4. **Configure Environment**
```bash
# Create .env file
cp env.example .env

# Edit with your values
nano .env
```

5. **Start Development Server**
```bash
npm run dev
```

Server runs on http://localhost:9080

---

## 🔧 Useful Commands

### Docker Commands
```bash
# View all logs
docker-compose logs -f

# View API logs only
docker-compose logs -f api

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Database Commands
```bash
# Access PostgreSQL console
docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb

# Backup database
docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > backup.sql

# Restore database
cat backup.sql | docker exec -i drawdb-postgres psql -U drawdb_user -d drawdb
```

### Testing Commands
```bash
# Build TypeScript
npm run build

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user (requires auth)
- `PUT /api/v1/auth/profile` - Update profile (requires auth)
- `PUT /api/v1/auth/password` - Change password (requires auth)

### Diagrams
- `GET /api/v1/diagrams` - Get all user diagrams (requires auth)
- `GET /api/v1/diagrams/:id` - Get specific diagram (requires auth)
- `POST /api/v1/diagrams` - Create new diagram (requires auth)
- `PUT /api/v1/diagrams/:id` - Update diagram (requires auth)
- `DELETE /api/v1/diagrams/:id` - Delete diagram (requires auth)
- `POST /api/v1/diagrams/:id/duplicate` - Duplicate diagram (requires auth)

### Collaboration
- `POST /api/v1/diagrams/:id/share` - Share diagram with user (requires auth)
- `GET /api/v1/diagrams/:id/shares` - Get all shares (requires auth)
- `PUT /api/v1/diagrams/:id/shares/:userId` - Update permissions (requires auth)
- `DELETE /api/v1/diagrams/:id/shares/:userId` - Revoke access (requires auth)
- `GET /api/v1/diagrams/shared-with-me` - Get shared diagrams (requires auth)

### Version Control
- `GET /api/v1/diagrams/:id/version` - Get version info (requires auth)
- `POST /api/v1/diagrams/:id/sync` - Check for conflicts (requires auth)

### Health
- `GET /health` - Health check endpoint

---

## 🔐 Security Notes

1. **Always change default passwords in production**
2. **Generate strong JWT secret**: `openssl rand -base64 64`
3. **Use HTTPS in production** (see DEPLOYMENT.md)
4. **Configure CORS properly** in `.env`
5. **Keep dependencies updated**: `npm audit fix`
6. **Secure the .env file**: `chmod 600 .env`

---

## 📖 Documentation

- [Full Deployment Guide](DEPLOYMENT.md)
- [Implementation Plan](plan.md)
- [Package Information](package.json)

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 9080
lsof -i :9080

# Kill the process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### API Returns 500 Errors
```bash
# Check API logs
docker-compose logs -f api

# Restart API
docker-compose restart api
```

---

## 📞 Support

For issues, check:
1. Docker logs: `docker-compose logs -f`
2. Database connectivity: `docker-compose ps`
3. Environment variables: `docker-compose config`
4. [Deployment Guide](DEPLOYMENT.md) for detailed troubleshooting

---

**Version:** 1.0.0  
**Last Updated:** January 2, 2026

