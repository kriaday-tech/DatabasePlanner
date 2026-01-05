# Getting Started Checklist

Follow this simple checklist to get Database Assistant up and running.

## ✅ Pre-Installation Checklist

- [ ] Docker is installed (version 20.10+)
- [ ] Docker Compose is installed (version 2.0+)
- [ ] Git is installed
- [ ] Ports 3000, 9080, and 5432 are available

## 🚀 Installation Steps

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Create environment files with secure random values
- ✅ Configure database password
- ✅ Optionally start the application

### Option 2: Manual Setup

#### Step 1: Backend Configuration

```bash
cd drawdb-server
cp env.example .env
```

Edit `drawdb-server/.env` and set:
- [ ] `DB_PASSWORD` - Generate secure password: `openssl rand -base64 32`
- [ ] `JWT_SECRET` - Generate secure secret: `openssl rand -base64 64`
- [ ] `CLIENT_URLS` - Set to `http://localhost:3000`

#### Step 2: Frontend Configuration

```bash
cd drawdb
echo "VITE_API_URL=http://localhost:9080" > .env
```

#### Step 3: Update docker-compose.yml

Update the PostgreSQL password in `docker-compose.yml`:
```yaml
environment:
  POSTGRES_PASSWORD: <use-same-password-as-DB_PASSWORD>
```

#### Step 4: Start Application

```bash
docker-compose up -d --build
```

## 🔍 Verification Steps

### 1. Check Services Are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                 STATUS              PORTS
drawdb-postgres      Up (healthy)        0.0.0.0:5432->5432/tcp
drawdb-backend       Up (healthy)        0.0.0.0:9080->9080/tcp
drawdb-frontend      Up                  0.0.0.0:3000->3000/tcp
```

### 2. Test Backend Health

```bash
curl http://localhost:9080/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "database": "connected"
}
```

### 3. Test Frontend

Open browser and navigate to:
```
http://localhost:3000
```

You should see the Database Assistant landing page.

### 4. Check Logs (if needed)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

## 👤 First Time Use

### 1. Register an Account

- [ ] Navigate to http://localhost:3000
- [ ] Click "Login" or "Sign Up"
- [ ] Enter email and password
- [ ] Click "Sign Up"

### 2. Create Your First Diagram

- [ ] After login, click "Editor" or navigate to `/editor`
- [ ] Select a database type (e.g., PostgreSQL)
- [ ] Click "Add Table" to create your first table
- [ ] Add columns and configure relationships
- [ ] Click "Save" to persist your diagram

### 3. Explore Features

- [ ] Try exporting to SQL
- [ ] Share a diagram with another user
- [ ] Explore different database types
- [ ] Try importing SQL schemas

## 🎯 Quick Feature Tour

### Creating Tables

1. Click the "Table" icon or use the "Add Table" button
2. Enter table name and columns
3. Set data types and constraints
4. Click "Save"

### Creating Relationships

1. Click on a foreign key field
2. Drag to the referenced table
3. Configure relationship type
4. Save the diagram

### Exporting

1. Go to File → Export
2. Choose format (SQL, PNG, PDF, etc.)
3. Select database type
4. Download the export

### Sharing

1. Click the "Share" button
2. Enter collaborator's email
3. Set permission level (View/Edit/Owner)
4. Send invitation

## 🔧 Common First-Time Issues

### Issue: Port Already in Use

**Solution:**
```bash
# Find and kill process using the port
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
```

### Issue: Can't Login/Register

**Check:**
- [ ] Backend is running: `curl http://localhost:9080/health`
- [ ] Database is connected (check logs)
- [ ] JWT_SECRET is set in backend .env
- [ ] Clear browser cache/cookies

### Issue: Diagram Not Saving

**Check:**
- [ ] You are logged in
- [ ] Backend logs for errors: `docker-compose logs backend`
- [ ] Database connection is working

### Issue: Blank Page After Login

**Solutions:**
1. Clear browser storage:
   ```javascript
   // In browser console
   localStorage.clear()
   sessionStorage.clear()
   ```
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check browser console for errors: `F12` → Console tab

## 📱 Application URLs

After successful setup, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:9080 | API server |
| **Health Check** | http://localhost:9080/health | Service status |

## 🛑 How to Stop

```bash
# Stop services (keeps data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## 🔄 How to Restart

```bash
# Quick restart
docker-compose restart

# Full restart with rebuild
docker-compose down
docker-compose up -d --build
```

## 📚 Next Steps

After completing this checklist:

1. **Read the full documentation**: [README.md](README.md)
2. **Check the quick reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
3. **Explore API endpoints**: http://localhost:9080/api/v1
4. **Join the community**: Check issues and discussions

## 🆘 Need Help?

If you're stuck:

1. ✅ Check logs: `docker-compose logs -f`
2. ✅ Verify configuration files exist and have correct values
3. ✅ Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common commands
4. ✅ Try a fresh start: `docker-compose down -v && ./setup.sh`
5. ✅ Check the troubleshooting section in [README.md](README.md)

## 🎉 Success Criteria

You're all set when:

- ✅ All three services show "Up" or "healthy" status
- ✅ Health check returns success
- ✅ Frontend loads in browser
- ✅ You can register and login
- ✅ You can create and save diagrams
- ✅ Diagrams persist after logout/refresh

**Happy Diagramming! 🎨**

