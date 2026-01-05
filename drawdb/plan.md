# DrawDB Backend Implementation Guide
## Cross-Browser Data Persistence Implementation

**Version:** 1.0  
**Date:** January 2, 2026  
**Objective:** Implement a backend database solution to enable DrawDB data persistence across different browsers and devices.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Technical Requirements](#technical-requirements)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Modifications](#frontend-modifications)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Authentication Flow](#authentication-flow)
10. [Migration Strategy](#migration-strategy)
11. [Testing Requirements](#testing-requirements)
12. [Deployment Guide](#deployment-guide)

---

## 1. Overview

### Problem Statement
DrawDB currently stores all diagram data in the browser's IndexedDB, making data inaccessible across different browsers or devices. Users cannot access their diagrams from multiple locations.

### Solution
Implement a backend API with user authentication and database storage to enable:
- User account creation and login
- Persistent storage of diagrams across browsers
- Synchronized access from any device
- Optional: Keep IndexedDB for offline functionality (hybrid approach)

### Scope
- Backend API server with Node.js/Express
- PostgreSQL database
- JWT-based authentication
- RESTful API endpoints
- Frontend integration with existing DrawDB application

---

## 2. Current Architecture

### Frontend Storage
- **Technology:** Dexie.js (IndexedDB wrapper)
- **Database Name:** `drawDB`
- **Stores:**
  - `diagrams`: User-created database diagrams
  - `templates`: Diagram templates

### Existing Backend (Optional)
- **Repository:** https://github.com/drawdb-io/drawdb-server
- **Current Features:**
  - GitHub Gist proxy for diagram sharing
  - Email sending functionality
- **Limitation:** No user authentication or persistent storage

### Data Structure (from `src/data/db.js`)
```javascript
{
  diagrams: {
    id: (auto-increment),
    lastModified: Date,
    loadedFromGistId: String,
    database: String,        // DB type (mysql, postgres, etc.)
    name: String,
    gistId: String,
    tables: Array,
    references: Array,
    notes: Array,
    areas: Array,
    todos: Array,
    pan: Object,
    zoom: Number,
    enums: Array,
    types: Array
  },
  templates: {
    id: (auto-increment),
    custom: Boolean,
    // ... template data
  }
}
```

---

## 3. Target Architecture

### System Components

```
┌─────────────────┐
│   Browser A     │
│  (Chrome)       │
└────────┬────────┘
         │
         ├─────────────┐
         │             │
    ┌────▼─────────────▼────┐
    │   Backend API Server  │
    │   (Node.js/Express)   │
    │                       │
    │  - Authentication     │
    │  - RESTful API        │
    │  - Business Logic     │
    └───────────┬───────────┘
                │
         ┌──────▼──────┐
         │  PostgreSQL │
         │   Database  │
         └─────────────┘
                ▲
                │
         ┌──────┴──────┐
         │             │
┌────────┴────────┐   │
│   Browser B     │   │
│  (Firefox)      │   │
└─────────────────┘   │
                      │
┌─────────────────────┴┐
│   Browser C         │
│  (Safari)           │
└─────────────────────┘
```

### Technology Stack

**Backend:**
- Runtime: Node.js (v18+)
- Framework: Express.js (v4.x)
- Database: PostgreSQL (v14+)
- ORM: Sequelize or Prisma
- Authentication: JWT (jsonwebtoken)
- Password Hashing: bcrypt
- Validation: express-validator or Zod

**Frontend Changes:**
- API Client: Axios (already installed)
- State Management: React Context (already in use)
- Token Storage: localStorage
- Fallback: Keep IndexedDB for offline mode

---

## 4. Technical Requirements

### Development Environment
- Node.js v18.x or higher
- PostgreSQL 14.x or higher
- npm or yarn
- Git

### Dependencies (Backend)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "sequelize": "^6.35.2",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

### Frontend Dependencies (Already Available)
- axios: ^1.12.0
- dexie: ^3.2.4 (keep for offline mode)

---

## 5. Backend Implementation

### 5.1 Project Structure

```
drawdb-server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── config.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Diagram.js
│   │   └── Template.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── diagrams.js
│   │   └── templates.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── diagramController.js
│   │   └── templateController.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── validators.js
│   └── app.js
├── migrations/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

### 5.2 Environment Configuration

Create `.env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# GitHub Integration (for existing gist feature)
GITHUB_TOKEN=your_github_token_here
```

### 5.3 Database Models

#### User Model (`src/models/User.js`)

```javascript
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
```

#### Diagram Model (`src/models/Diagram.js`)

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Diagram = sequelize.define('Diagram', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Untitled Diagram',
    },
    database: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'generic',
    },
    tables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    references: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    areas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    todos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    enums: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    types: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    pan: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { x: 0, y: 0 },
    },
    zoom: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 1.0,
    },
    gistId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    loadedFromGistId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    lastModified: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    timestamps: true,
    tableName: 'diagrams',
    indexes: [
      {
        fields: ['userId', 'lastModified'],
      },
      {
        fields: ['userId', 'name'],
      },
    ],
  });

  return Diagram;
};
```

#### Template Model (`src/models/Template.js`)

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // null for system templates
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    custom: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    timestamps: true,
    tableName: 'templates',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['custom', 'isPublic'],
      },
    ],
  });

  return Template;
};
```

### 5.4 Authentication Middleware (`src/middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Token expired',
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed',
    });
  }
};

module.exports = { authenticate };
```

---

## 6. Frontend Modifications

### 6.1 Create API Service Layer

Create new file: `src/api/backend.js`

```javascript
import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Diagram API
export const diagramAPI = {
  getAll: async () => {
    const response = await api.get('/diagrams');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/diagrams/${id}`);
    return response.data;
  },

  create: async (diagramData) => {
    const response = await api.post('/diagrams', diagramData);
    return response.data;
  },

  update: async (id, diagramData) => {
    const response = await api.put(`/diagrams/${id}`, diagramData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/diagrams/${id}`);
    return response.data;
  },
};

// Template API
export const templateAPI = {
  getAll: async () => {
    const response = await api.get('/templates');
    return response.data;
  },

  create: async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  update: async (id, templateData) => {
    const response = await api.put(`/templates/${id}`, templateData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },
};

export default api;
```

### 6.2 Create Auth Context

Create new file: `src/context/AuthContext.jsx`

```javascript
import { createContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/backend';

export const AuthContext = createContext(null);

export default function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          authAPI.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    try {
      await authAPI.register(username, email, password);
      // Auto-login after registration
      return await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  }, [login]);

  const logout = useCallback(() => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 6.3 Modify Workspace Component

Update `src/components/Workspace.jsx` to use backend API:

```javascript
// Add at the top
import { diagramAPI } from '../api/backend';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Inside the component
const { isAuthenticated } = useContext(AuthContext);

// Modify the save function
const save = useCallback(async () => {
  if (!isAuthenticated) {
    // Fall back to IndexedDB if not authenticated
    // ... existing IndexedDB save logic
    return;
  }

  const diagramData = {
    database: database,
    name: title,
    gistId: gistId ?? "",
    lastModified: new Date(),
    tables: tables,
    references: relationships,
    notes: notes,
    areas: areas,
    todos: tasks,
    pan: transform.pan,
    zoom: transform.zoom,
    loadedFromGistId: loadedFromGistId,
    ...(databases[database].hasEnums && { enums: enums }),
    ...(databases[database].hasTypes && { types: types }),
  };

  try {
    if (id === 0 || window.name === "") {
      // Create new diagram
      const newDiagram = await diagramAPI.create(diagramData);
      setId(newDiagram.id);
      window.name = `d ${newDiagram.id}`;
    } else {
      // Update existing diagram
      await diagramAPI.update(id, diagramData);
    }
    
    setSaveState(State.SAVED);
    setLastSaved(new Date().toLocaleString());
  } catch (error) {
    console.error('Save failed:', error);
    setSaveState(State.ERROR);
    // Optionally fall back to IndexedDB
  }
}, [isAuthenticated, id, database, title, gistId, tables, relationships, notes, areas, tasks, transform, loadedFromGistId, enums, types]);
```

---

## 7. Database Schema

### PostgreSQL Migration SQL

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create diagrams table
CREATE TABLE diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Diagram',
  database VARCHAR(50) NOT NULL DEFAULT 'generic',
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  references JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  todos JSONB NOT NULL DEFAULT '[]'::jsonb,
  enums JSONB,
  types JSONB,
  pan JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  zoom FLOAT DEFAULT 1.0,
  gist_id VARCHAR(255),
  loaded_from_gist_id VARCHAR(255),
  last_modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  custom BOOLEAN DEFAULT true,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_diagrams_user_modified ON diagrams(user_id, last_modified DESC);
CREATE INDEX idx_diagrams_user_name ON diagrams(user_id, name);
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_templates_public ON templates(custom, is_public);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagrams_updated_at BEFORE UPDATE ON diagrams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| PUT | `/api/v1/auth/profile` | Update profile | Yes |
| PUT | `/api/v1/auth/password` | Change password | Yes |

### Diagram Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/diagrams` | Get all user diagrams | Yes |
| GET | `/api/v1/diagrams/:id` | Get specific diagram | Yes |
| POST | `/api/v1/diagrams` | Create new diagram | Yes |
| PUT | `/api/v1/diagrams/:id` | Update diagram | Yes |
| DELETE | `/api/v1/diagrams/:id` | Delete diagram | Yes |
| POST | `/api/v1/diagrams/:id/duplicate` | Duplicate diagram | Yes |

### Template Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/templates` | Get all templates | Yes |
| GET | `/api/v1/templates/:id` | Get specific template | Yes |
| POST | `/api/v1/templates` | Create template | Yes |
| PUT | `/api/v1/templates/:id` | Update template | Yes |
| DELETE | `/api/v1/templates/:id` | Delete template | Yes |

---

## 9. Authentication Flow

### Registration Flow

```
User Input (email, username, password)
    ↓
Frontend Validation
    ↓
POST /api/v1/auth/register
    ↓
Backend Validation
    ↓
Hash Password (bcrypt)
    ↓
Save to Database
    ↓
Auto-login → Generate JWT
    ↓
Return {token, user}
    ↓
Store in localStorage
    ↓
Redirect to Dashboard
```

### Login Flow

```
User Input (email, password)
    ↓
POST /api/v1/auth/login
    ↓
Validate Credentials
    ↓
Compare Password Hash
    ↓
Generate JWT Token
    ↓
Update last_login timestamp
    ↓
Return {token, user}
    ↓
Store in localStorage
    ↓
Redirect to Dashboard
```

### Authentication Check

```
Every API Request
    ↓
Extract Bearer Token
    ↓
Verify JWT Signature
    ↓
Check Token Expiration
    ↓
Load User from DB
    ↓
Attach to req.user
    ↓
Proceed to Controller
```

---

## 10. Migration Strategy

### Phase 1: Backend Setup (Week 1)
1. Set up PostgreSQL database
2. Create backend project structure
3. Implement models and migrations
4. Create authentication endpoints
5. Test authentication flow

### Phase 2: Core API (Week 2)
1. Implement diagram CRUD endpoints
2. Implement template endpoints
3. Add validation and error handling
4. Write unit tests
5. Test with Postman/Insomnia

### Phase 3: Frontend Integration (Week 3)
1. Create API service layer
2. Implement Auth Context
3. Create login/register UI
4. Update Workspace component
5. Test end-to-end flow

### Phase 4: Data Migration (Week 4)
1. Create migration tool for existing IndexedDB data
2. Add sync functionality
3. Implement offline mode (optional)
4. Testing and bug fixes

### Phase 5: Deployment (Week 5)
1. Set up production database
2. Deploy backend to hosting service
3. Configure environment variables
4. Deploy frontend with new backend URL
5. Monitor and optimize

---

## 11. Testing Requirements

### Backend Tests

```javascript
// Example test structure
describe('Auth API', () => {
  test('POST /auth/register - should create new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
  });

  test('POST /auth/login - should login user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});

describe('Diagram API', () => {
  let authToken;
  
  beforeAll(async () => {
    // Login and get token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'SecurePass123!' });
    authToken = response.body.token;
  });

  test('GET /diagrams - should return user diagrams', async () => {
    const response = await request(app)
      .get('/api/v1/diagrams')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /diagrams - should create diagram', async () => {
    const response = await request(app)
      .post('/api/v1/diagrams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Diagram',
        database: 'postgresql',
        tables: [],
        references: [],
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Frontend Tests
- Test Auth Context state management
- Test API error handling
- Test offline fallback to IndexedDB
- Test token refresh flow

---

## 12. Deployment Guide

### Backend Deployment (Example: Railway/Render/Heroku)

1. **Create PostgreSQL Database**
   ```bash
   # Railway will auto-provision
   # Or use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
   ```

2. **Set Environment Variables**
   ```bash
   NODE_ENV=production
   DB_HOST=<your-db-host>
   DB_PORT=5432
   DB_NAME=drawdb_prod
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   JWT_SECRET=<generate-secure-random-string>
   ALLOWED_ORIGINS=https://drawdb.app,https://www.drawdb.app
   ```

3. **Deploy Backend**
   ```bash
   git push railway main
   # or
   git push heroku main
   ```

4. **Run Migrations**
   ```bash
   # Connect to production DB and run schema
   psql $DATABASE_URL -f migrations/001_initial_schema.sql
   ```

### Frontend Deployment

1. **Update Environment Variable**
   ```bash
   # .env.production
   VITE_BACKEND_URL=https://your-backend.railway.app
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   # Deploy to Vercel/Netlify
   vercel --prod
   ```

---

## Security Considerations

1. **Password Security**
   - Use bcrypt with appropriate rounds (10-12)
   - Never store plain text passwords
   - Implement password strength requirements

2. **JWT Security**
   - Use strong secret (minimum 256 bits)
   - Set appropriate expiration (7-30 days)
   - Consider refresh tokens for longer sessions

3. **API Security**
   - Enable CORS with specific origins
   - Use Helmet.js for security headers
   - Implement rate limiting
   - Validate all inputs
   - Sanitize user-generated content

4. **Database Security**
   - Use parameterized queries (Sequelize handles this)
   - Restrict database user permissions
   - Enable SSL for database connections
   - Regular backups

5. **Environment Variables**
   - Never commit .env files
   - Use different secrets for dev/prod
   - Rotate secrets regularly

---

## Performance Optimization

1. **Database Indexing**
   - Index foreign keys
   - Index frequently queried fields
   - Use JSONB for flexible schema

2. **Caching**
   - Consider Redis for session storage
   - Cache frequently accessed data
   - Implement ETags for API responses

3. **API Optimization**
   - Implement pagination for large lists
   - Use selective field loading
   - Compress responses (gzip)

4. **Frontend Optimization**
   - Debounce auto-save operations
   - Use optimistic UI updates
   - Implement local caching strategy

---

## Monitoring and Logging

1. **Logging**
   - Use Winston or Pino for structured logging
   - Log all authentication attempts
   - Log API errors with context
   - Don't log sensitive data

2. **Monitoring**
   - Set up health check endpoint
   - Monitor database connection pool
   - Track API response times
   - Set up alerts for errors

3. **Analytics**
   - Track user registration/login
   - Monitor active users
   - Track diagram creation/updates

---

## Support and Maintenance

1. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Developer setup guide
   - Deployment runbook

2. **Backup Strategy**
   - Automated daily backups
   - Point-in-time recovery
   - Test restore procedures

3. **Update Strategy**
   - Database migration strategy
   - Zero-downtime deployment
   - Rollback procedures

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup | 2-3 days | Project structure, dependencies, database setup |
| Backend Auth | 3-4 days | User model, auth endpoints, JWT implementation |
| Backend API | 4-5 days | CRUD endpoints, validation, error handling |
| Frontend Integration | 5-7 days | API layer, Auth context, UI components |
| Testing | 3-4 days | Unit tests, integration tests, E2E tests |
| Migration | 2-3 days | IndexedDB migration tool, data sync |
| Deployment | 2-3 days | Production setup, monitoring, final testing |
| **Total** | **3-4 weeks** | Full implementation |

---

## Success Criteria

- ✅ Users can register and login
- ✅ Diagrams persist across browsers
- ✅ Multiple devices can access same account
- ✅ Offline mode still works (optional)
- ✅ Existing gist sharing functionality intact
- ✅ Performance comparable to local storage
- ✅ 99.9% uptime
- ✅ Response time < 200ms
- ✅ Secure authentication
- ✅ Data privacy and security

---

## Questions for Product Owner

1. Do we need offline mode / hybrid storage?
2. What's the expected number of users?
3. Any specific hosting preferences?
4. Should we migrate existing IndexedDB data?
5. Do we need team/collaboration features?
6. What's the budget for hosting/infrastructure?

---

## Additional Resources

- [Sequelize Documentation](https://sequelize.org/)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [React Context API](https://react.dev/reference/react/useContext)

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Prepared By:** Technical Architecture Team  
**Contact:** [Your contact information]

