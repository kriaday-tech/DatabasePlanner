# DatabaseAssistant

A self-hosted database design and ERD tool powered by DrawDB.

## Quick Start

```bash
# Clone and enter the directory
cd DatabaseAssistant

# Start all services
docker compose up -d

# Check status
docker compose ps
```

Access the application at: **http://localhost:3000**

## Services

- **Frontend**: Port 3000 (DrawDB UI)
- **Backend API**: Port 9080
- **PostgreSQL**: Port 5432

## Configuration

Create a `.env` file for custom settings (optional):

```env
# Database
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=changeme123

# Backend
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=production

# Frontend
VITE_BACKEND_URL=http://localhost:9080
```

## Management Commands

```bash
# Stop services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build
```

## Requirements

- Docker 20.10+
- Docker Compose 2.0+

## Troubleshooting

**Services won't start?**
```bash
docker compose down -v
docker compose up -d
```

**Check logs:**
```bash
docker compose logs backend
docker compose logs frontend
```

## Project Structure

```
DatabaseAssistant/
├── drawdb/              # Frontend application
├── drawdb-server/       # Backend API server
├── docker-compose.yml   # Service orchestration
├── setup.sh            # Setup script
└── start.sh            # Start script
```
