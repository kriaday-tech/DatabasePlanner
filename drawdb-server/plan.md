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
- **Team collaboration with sharing and permissions**
- **Timestamp-based conflict resolution for concurrent edits**

### Scope
- Backend API server with Node.js/Express
- PostgreSQL database
- JWT-based authentication
- RESTful API endpoints
- **Team collaboration and sharing features**
- **Conflict resolution for concurrent edits**
- **Docker-based deployment on Azure VM (port 9080)**
- Frontend integration with existing DrawDB application
- **Target: 5-10 concurrent users**

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
- **Collaboration UI**: Sharing dialogs, conflict resolution
- **Real-time sync**: Polling or WebSocket for live updates

---

## 4. Technical Requirements

### Development Environment
- Node.js v18.x or higher
- PostgreSQL 14.x or higher
- **Docker and Docker Compose**
- npm or yarn
- Git

### Production Environment
- **Azure VM with Docker support**
- **Port 9080 exposed for API access**
- **PostgreSQL in Docker container**
- **Automated backup strategy**

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
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
      {
        fields: ['version'],
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

#### DiagramShare Model (`src/models/DiagramShare.js`)

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DiagramShare = sequelize.define('DiagramShare', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    diagramId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'diagrams',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sharedWithUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sharedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permissionLevel: {
      type: DataTypes.ENUM('viewer', 'editor', 'owner'),
      allowNull: false,
      defaultValue: 'viewer',
    },
  }, {
    timestamps: true,
    tableName: 'diagram_shares',
    indexes: [
      {
        unique: true,
        fields: ['diagramId', 'sharedWithUserId'],
      },
      {
        fields: ['sharedWithUserId'],
      },
      {
        fields: ['diagramId'],
      },
    ],
  });

  return DiagramShare;
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

### 6.4 Complete Frontend Integration Guide

This section provides a comprehensive step-by-step guide for integrating the frontend with the backend API.

#### 6.4.1 Environment Configuration

**Step 1: Create Environment File**

Create `.env` in the `/drawdb` directory:

```bash
# Backend API URL - Update this to your backend URL
VITE_BACKEND_URL=http://localhost:9080

# For production deployment
# VITE_BACKEND_URL=https://your-azure-vm-ip:9080
# or
# VITE_BACKEND_URL=https://api.yourdomain.com
```

**Step 2: Create Production Environment File**

Create `.env.production`:

```bash
VITE_BACKEND_URL=https://your-azure-vm-ip:9080
# or with domain name
# VITE_BACKEND_URL=https://api.yourdomain.com
```

**Note:** Vite automatically uses `.env.production` during production builds (`npm run build`).

---

#### 6.4.2 Backend API Service Layer

**File Location:** `/drawdb/src/api/backend.js`

**Purpose:** Centralized API client with authentication interceptors

**Key Features:**
- Axios instance with base URL configuration
- Automatic JWT token injection in requests
- Auto-redirect on 401 (unauthorized) responses
- Complete API methods for auth, diagrams, and collaboration

**Implementation:**

```javascript
import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9080';

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

  updateProfile: async (username, email) => {
    const response = await api.put('/auth/profile', { username, email });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword,
    });
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

  duplicate: async (id) => {
    const response = await api.post(`/diagrams/${id}/duplicate`);
    return response.data;
  },

  getVersion: async (id) => {
    const response = await api.get(`/diagrams/${id}/version`);
    return response.data;
  },

  sync: async (id, currentVersion) => {
    const response = await api.post(`/diagrams/${id}/sync`, {
      currentVersion,
    });
    return response.data;
  },

  // Collaboration endpoints
  share: async (id, userId, permissionLevel) => {
    const response = await api.post(`/diagrams/${id}/share`, {
      userId,
      permissionLevel,
    });
    return response.data;
  },

  getShares: async (id) => {
    const response = await api.get(`/diagrams/${id}/shares`);
    return response.data;
  },

  updateShare: async (id, userId, permissionLevel) => {
    const response = await api.put(`/diagrams/${id}/shares/${userId}`, {
      permissionLevel,
    });
    return response.data;
  },

  revokeShare: async (id, userId) => {
    const response = await api.delete(`/diagrams/${id}/shares/${userId}`);
    return response.data;
  },

  getSharedWithMe: async () => {
    const response = await api.get('/diagrams/shared-with-me');
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

---

#### 6.4.3 Authentication Context

**File Location:** `/drawdb/src/context/AuthContext.jsx`

**Purpose:** Global authentication state management

**Features:**
- Persistent authentication check on app load
- Login/register/logout functions
- User state management
- Auto-token validation

**Implementation:**

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

---

#### 6.4.4 Authentication Hook

**File Location:** `/drawdb/src/hooks/useAuth.js`

**Purpose:** Convenient hook to access auth context

**Implementation:**

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}
```

**Update hooks index:** Add to `/drawdb/src/hooks/index.js`:

```javascript
export { default as useAuth } from "./useAuth";
```

---

#### 6.4.5 App Component Modifications

**File Location:** `/drawdb/src/App.jsx`

**Changes Required:**

```javascript
import AuthContextProvider from "./context/AuthContext";

function App() {
  return (
    <AuthContextProvider>
      {/* Existing app content */}
      <Router>
        {/* Routes */}
      </Router>
    </AuthContextProvider>
  );
}

export default App;
```

---

#### 6.4.6 Workspace Component Integration

**File Location:** `/drawdb/src/components/Workspace.jsx`

**Changes Required:**

**1. Add imports:**

```javascript
import { diagramAPI } from '../api/backend';
import { useAuth } from '../hooks';
```

**2. Add state variables:**

```javascript
const { isAuthenticated, user } = useAuth();
const [currentVersion, setCurrentVersion] = useState(1);
const [showConflictDialog, setShowConflictDialog] = useState(false);
const [conflictData, setConflictData] = useState(null);
```

**3. Replace save function:**

```javascript
const save = useCallback(async () => {
  // Check if user is authenticated
  if (!isAuthenticated) {
    console.warn('User not authenticated, saving to IndexedDB');
    // Fallback to existing IndexedDB logic
    // ... keep existing IndexedDB save code ...
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
    expectedVersion: currentVersion, // For conflict detection
    ...(databases[database].hasEnums && { enums: enums }),
    ...(databases[database].hasTypes && { types: types }),
  };

  try {
    setSaveState(State.SAVING);

    if (id === 0 || window.name === "") {
      // Create new diagram
      const newDiagram = await diagramAPI.create(diagramData);
      setId(newDiagram.id);
      setCurrentVersion(newDiagram.version);
      window.name = `d ${newDiagram.id}`;
    } else {
      // Update existing diagram
      const updatedDiagram = await diagramAPI.update(id, diagramData);
      setCurrentVersion(updatedDiagram.version);
    }
    
    setSaveState(State.SAVED);
    setLastSaved(new Date().toLocaleString());
  } catch (error) {
    console.error('Save failed:', error);
    
    if (error.response?.status === 409) {
      // Conflict detected - show resolution dialog
      setConflictData({
        localChanges: diagramData,
        serverVersion: error.response.data.currentVersion,
      });
      setShowConflictDialog(true);
      setSaveState(State.ERROR);
    } else {
      setSaveState(State.ERROR);
      Toast.error('Failed to save diagram');
    }
  }
}, [
  isAuthenticated,
  id,
  database,
  title,
  gistId,
  tables,
  relationships,
  notes,
  areas,
  tasks,
  transform,
  loadedFromGistId,
  enums,
  types,
  currentVersion,
  setSaveState,
]);
```

**4. Add periodic sync for collaboration:**

```javascript
// Poll for updates every 30 seconds when editing a shared diagram
useEffect(() => {
  if (!isAuthenticated || !id || id === 0) return;

  const interval = setInterval(async () => {
    try {
      const versionInfo = await diagramAPI.getVersion(id);
      
      if (versionInfo.version > currentVersion) {
        Toast.warning({
          content: `Diagram updated by ${versionInfo.lastModifiedBy}. Reload to see changes.`,
          duration: 5,
        });
      }
    } catch (error) {
      console.error('Version check failed:', error);
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [isAuthenticated, id, currentVersion]);
```

---

#### 6.4.7 Login/Register Page

**File Location:** `/drawdb/src/pages/Login.jsx`

**Purpose:** User authentication UI

**Implementation:**

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { Button, Input, Form, Toast } from '@douyinfe/semi-ui';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      let result;
      if (isLogin) {
        result = await login(values.email, values.password);
      } else {
        result = await register(values.username, values.email, values.password);
      }

      if (result.success) {
        Toast.success(`${isLogin ? 'Login' : 'Registration'} successful!`);
        navigate('/editor');
      } else {
        Toast.error(result.error);
      }
    } catch (error) {
      Toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Login to DrawDB' : 'Register for DrawDB'}
        </h2>
        
        <Form onSubmit={handleSubmit}>
          {!isLogin && (
            <Form.Input
              field="username"
              label="Username"
              placeholder="Enter username"
              rules={[{ required: true, message: 'Username is required' }]}
            />
          )}
          
          <Form.Input
            field="email"
            label="Email"
            type="email"
            placeholder="Enter email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          />
          
          <Form.Input
            field="password"
            label="Password"
            type="password"
            placeholder="Enter password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          />
          
          <Button
            htmlType="submit"
            type="primary"
            block
            loading={loading}
            className="mt-4"
          >
            {isLogin ? 'Login' : 'Register'}
          </Button>
        </Form>

        <div className="mt-4 text-center">
          <Button
            type="tertiary"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin 
              ? "Don't have an account? Register" 
              : "Already have an account? Login"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

#### 6.4.8 Protected Route Component

**File Location:** Create as part of router configuration

**Purpose:** Protect routes that require authentication

**Implementation:**

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
```

---

#### 6.4.9 Router Configuration

**Modifications Required:**

Update your router (in `App.jsx` or separate router file):

```javascript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './pages/Login';
import Editor from './pages/Editor';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/editor" replace />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/editor",
    element: (
      <ProtectedRoute>
        <Editor />
      </ProtectedRoute>
    ),
  },
  // Add other routes as needed
]);

function App() {
  return (
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  );
}
```

---

#### 6.4.10 Conflict Resolution Dialog (Optional but Recommended)

**File Location:** `/drawdb/src/components/ConflictDialog.jsx`

**Purpose:** Handle concurrent edit conflicts

**Implementation:**

```javascript
import { Modal, Button, Alert, Typography } from '@douyinfe/semi-ui';

export default function ConflictDialog({ 
  visible, 
  conflictData, 
  onResolve, 
  onClose 
}) {
  if (!conflictData) return null;

  const { localChanges, serverVersion } = conflictData;

  return (
    <Modal
      title="Conflict Detected"
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Alert
        type="warning"
        message="This diagram was modified by another user"
        description={`
          Modified by: ${serverVersion.lastModifiedBy}
          at ${new Date(serverVersion.lastModified).toLocaleString()}
        `}
      />

      <div className="mt-4">
        <Typography.Text strong>Resolution Options:</Typography.Text>
        
        <div className="flex flex-col gap-2 mt-3">
          <Button
            block
            onClick={() => onResolve('keep-server')}
          >
            Use Server Version (Discard My Changes)
          </Button>
          
          <Button
            block
            type="warning"
            onClick={() => onResolve('keep-local')}
          >
            Use My Version (Override Server)
          </Button>
          
          <Button
            block
            type="tertiary"
            onClick={() => onResolve('view-diff')}
          >
            View Differences
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

#### 6.4.11 Collaboration UI Components

**File Location:** `/drawdb/src/components/ShareDialog.jsx`

**Purpose:** Share diagrams with team members

**Implementation:**

```javascript
import { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, Toast, List } from '@douyinfe/semi-ui';
import { diagramAPI } from '../api/backend';

export default function ShareDialog({ visible, diagramId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState([]);

  const handleShare = async (values) => {
    setLoading(true);
    try {
      await diagramAPI.share(
        diagramId,
        values.userId,
        values.permissionLevel
      );
      Toast.success('Diagram shared successfully');
      loadShares();
    } catch (error) {
      Toast.error('Failed to share diagram');
    } finally {
      setLoading(false);
    }
  };

  const loadShares = async () => {
    try {
      const data = await diagramAPI.getShares(diagramId);
      setShares(data);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      loadShares();
    }
  }, [visible]);

  return (
    <Modal
      title="Share Diagram"
      visible={visible}
      onCancel={onClose}
      footer={null}
    >
      <Form onSubmit={handleShare}>
        <Form.Input
          field="userId"
          label="User ID or Email"
          placeholder="Enter user ID or email"
          rules={[{ required: true }]}
        />
        
        <Form.Select
          field="permissionLevel"
          label="Permission Level"
          defaultValue="viewer"
          rules={[{ required: true }]}
        >
          <Select.Option value="viewer">Viewer</Select.Option>
          <Select.Option value="editor">Editor</Select.Option>
          <Select.Option value="owner">Owner</Select.Option>
        </Form.Select>
        
        <Button
          htmlType="submit"
          type="primary"
          loading={loading}
          block
        >
          Share
        </Button>
      </Form>

      {shares.length > 0 && (
        <div className="mt-6">
          <h4>Current Collaborators</h4>
          <List
            dataSource={shares}
            renderItem={(share) => (
              <List.Item>
                {share.sharedWithUser.email} - {share.permissionLevel}
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
}
```

---

#### 6.4.12 Frontend Configuration Checklist

**Files to Create:**
- [ ] `/drawdb/.env` - Development environment config
- [ ] `/drawdb/.env.production` - Production environment config
- [ ] `/drawdb/src/api/backend.js` - API service layer
- [ ] `/drawdb/src/context/AuthContext.jsx` - Authentication context
- [ ] `/drawdb/src/hooks/useAuth.js` - Auth hook
- [ ] `/drawdb/src/pages/Login.jsx` - Login/register page
- [ ] `/drawdb/src/components/ProtectedRoute.jsx` - Protected route wrapper
- [ ] `/drawdb/src/components/ConflictDialog.jsx` - Conflict resolution UI
- [ ] `/drawdb/src/components/ShareDialog.jsx` - Sharing UI

**Files to Modify:**
- [ ] `/drawdb/src/App.jsx` - Wrap with AuthContext, add routes
- [ ] `/drawdb/src/hooks/index.js` - Export useAuth
- [ ] `/drawdb/src/components/Workspace.jsx` - Integrate backend save logic
- [ ] Router configuration - Add login route and protected routes

**Environment Variables:**
- [ ] `VITE_BACKEND_URL` - Backend API base URL (default: http://localhost:9080)

---

#### 6.4.13 Testing Frontend Integration

**Step 1: Start Backend**
```bash
cd drawdb-server
docker-compose up -d
curl http://localhost:9080/health  # Verify backend is running
```

**Step 2: Configure Frontend**
```bash
cd drawdb
echo "VITE_BACKEND_URL=http://localhost:9080" > .env
npm install  # Ensure all dependencies are installed
```

**Step 3: Start Frontend**
```bash
npm run dev
```

**Step 4: Test Authentication Flow**
1. Navigate to http://localhost:5173/login
2. Register a new account
3. Verify redirect to editor
4. Check browser localStorage for `auth_token`

**Step 5: Test Diagram Operations**
1. Create a new diagram
2. Add tables and relationships
3. Save the diagram
4. Verify save success message
5. Check PostgreSQL database:
   ```bash
   docker exec -it drawdb-postgres psql -U drawdb_user -d drawdb
   SELECT id, name, version FROM diagrams;
   ```

**Step 6: Test Collaboration**
1. Register a second test user
2. Share a diagram with the second user
3. Login as second user
4. Verify access to shared diagram
5. Test edit permissions

**Step 7: Test Conflict Resolution**
1. Open same diagram in two browser windows (different users)
2. Make changes in both windows
3. Save from first window (should succeed)
4. Save from second window (should show conflict)
5. Verify conflict resolution dialog appears

---

#### 6.4.14 Troubleshooting Frontend Integration

**Issue: CORS Errors**
```
Solution: Verify backend CORS configuration includes frontend URL
Check drawdb-server/.env: ALLOWED_ORIGINS should include http://localhost:5173
```

**Issue: 401 Unauthorized on API Calls**
```
Solution: Check that JWT token is being stored and sent
Open browser DevTools > Application > Local Storage
Verify 'auth_token' exists
Check Network tab for Authorization header in requests
```

**Issue: Environment Variable Not Loading**
```
Solution: Restart Vite dev server after changing .env
Environment variables are loaded at build/dev server start
```

**Issue: Login Successful but Redirect Fails**
```
Solution: Verify router configuration and protected routes
Check that ProtectedRoute component is implemented
Ensure AuthContext is wrapping the router
```

**Issue: Diagrams Not Saving**
```
Solution: Check browser console for errors
Verify backend is running: curl http://localhost:9080/health
Check PostgreSQL connection in backend logs
```

---

#### 6.4.15 Production Deployment

**Build Frontend:**
```bash
cd drawdb
npm run build
```

**Deploy Options:**

**Option 1: Vercel**
```bash
vercel --prod
# Set environment variable: VITE_BACKEND_URL=https://your-api-domain.com
```

**Option 2: Netlify**
```bash
netlify deploy --prod
# Configure environment: VITE_BACKEND_URL=https://your-api-domain.com
```

**Option 3: Azure Static Web Apps**
```bash
az staticwebapp create \
  --name drawdb-frontend \
  --resource-group your-resource-group \
  --source . \
  --location "East US" \
  --branch main
  
# Set environment variable via Azure Portal
```

**Option 4: Self-hosted with Nginx**
```bash
# Build frontend
npm run build

# Copy to server
scp -r dist/* user@server:/var/www/drawdb/

# Nginx configuration
server {
    listen 80;
    server_name drawdb.yourdomain.com;
    root /var/www/drawdb;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

#### 6.4.16 Frontend Migration Summary

**Before Integration:**
- ✅ Frontend uses IndexedDB (Dexie.js) for local storage
- ✅ No user authentication
- ✅ No cross-device access
- ✅ Gist sharing for collaboration

**After Integration:**
- ✅ Frontend connects to PostgreSQL backend
- ✅ User authentication with JWT
- ✅ Cross-device diagram access
- ✅ Team collaboration with permissions
- ✅ Conflict resolution for concurrent edits
- ✅ Real-time sync checking
- ✅ Fallback to IndexedDB when not authenticated (optional)

**Benefits:**
- 🎯 Diagrams accessible from any browser/device
- 🎯 Multi-user collaboration
- 🎯 Version control and conflict resolution
- 🎯 Secure user authentication
- 🎯 Centralized data management
- 🎯 Team permission controls

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
  last_modified_by UUID REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create diagram sharing table
CREATE TABLE diagram_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_diagram_user UNIQUE(diagram_id, shared_with_user_id),
  CONSTRAINT valid_permission CHECK (permission_level IN ('viewer', 'editor', 'owner'))
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
CREATE INDEX idx_diagrams_version ON diagrams(version);
CREATE INDEX idx_diagram_shares_diagram ON diagram_shares(diagram_id);
CREATE INDEX idx_diagram_shares_user ON diagram_shares(shared_with_user_id);
CREATE INDEX idx_diagram_shares_shared_by ON diagram_shares(shared_by_user_id);
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

CREATE TRIGGER update_diagram_shares_updated_at BEFORE UPDATE ON diagram_shares
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
| GET | `/api/v1/diagrams` | Get all user diagrams (owned + shared) | Yes |
| GET | `/api/v1/diagrams/:id` | Get specific diagram | Yes |
| POST | `/api/v1/diagrams` | Create new diagram | Yes |
| PUT | `/api/v1/diagrams/:id` | Update diagram (with version check) | Yes |
| DELETE | `/api/v1/diagrams/:id` | Delete diagram | Yes |
| POST | `/api/v1/diagrams/:id/duplicate` | Duplicate diagram | Yes |
| **GET** | **`/api/v1/diagrams/:id/version`** | **Get current version info** | **Yes** |
| **POST** | **`/api/v1/diagrams/:id/sync`** | **Sync with conflict detection** | **Yes** |

### Collaboration Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **POST** | **`/api/v1/diagrams/:id/share`** | **Share diagram with user** | **Yes** |
| **GET** | **`/api/v1/diagrams/:id/shares`** | **Get all shares for diagram** | **Yes** |
| **PUT** | **`/api/v1/diagrams/:id/shares/:userId`** | **Update permission level** | **Yes** |
| **DELETE** | **`/api/v1/diagrams/:id/shares/:userId`** | **Revoke access** | **Yes** |
| **GET** | **`/api/v1/diagrams/shared-with-me`** | **Get diagrams shared with user** | **Yes** |

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

## 10. Conflict Resolution Strategy

### Overview
When multiple users edit the same diagram simultaneously, conflicts must be detected and resolved using timestamp-based optimistic locking.

### Version Control Approach

```
User A loads diagram (version 5, timestamp: T1)
User B loads diagram (version 5, timestamp: T1)
    ↓
User A makes changes and saves
    → Server checks: version matches? ✓
    → Save succeeds, version → 6, timestamp → T2
    ↓
User B makes changes and saves
    → Server checks: version matches? ✗ (expecting 5, but now 6)
    → Return 409 Conflict with server's version
    → User B sees conflict resolution UI
```

### Backend Implementation

```javascript
// Diagram Controller - Update with conflict detection
async update(req, res) {
  const { id } = req.params;
  const { expectedVersion, ...diagramData } = req.body;
  const userId = req.userId;

  const transaction = await sequelize.transaction();

  try {
    // Find diagram with lock
    const diagram = await Diagram.findOne({
      where: { id },
      include: [{
        model: DiagramShare,
        as: 'shares',
        where: {
          sharedWithUserId: userId,
          permissionLevel: ['editor', 'owner']
        },
        required: false
      }],
      lock: true,
      transaction
    });

    if (!diagram) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Check ownership or edit permission
    const hasEditAccess = diagram.userId === userId || 
                         diagram.shares.some(s => s.sharedWithUserId === userId);
    
    if (!hasEditAccess) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No edit permission' });
    }

    // Conflict detection
    if (expectedVersion && diagram.version !== expectedVersion) {
      await transaction.rollback();
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'Diagram was modified by another user',
        currentVersion: {
          version: diagram.version,
          lastModified: diagram.lastModified,
          lastModifiedBy: diagram.lastModifiedBy,
          data: diagram.toJSON()
        }
      });
    }

    // Update with version increment
    await diagram.update({
      ...diagramData,
      version: diagram.version + 1,
      lastModifiedBy: userId,
      lastModified: new Date()
    }, { transaction });

    await transaction.commit();

    // Notify other collaborators (implement via WebSocket or polling)
    notifyCollaborators(id, diagram, userId);

    res.json(diagram);
  } catch (error) {
    await transaction.rollback();
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update diagram' });
  }
}
```

### Frontend Implementation

```javascript
// Save with conflict detection
const save = async () => {
  const diagramData = {
    database: database,
    name: title,
    tables: tables,
    references: relationships,
    notes: notes,
    areas: areas,
    todos: tasks,
    pan: transform.pan,
    zoom: transform.zoom,
    enums: enums,
    types: types,
    expectedVersion: currentVersion // Send current version
  };

  try {
    const response = await diagramAPI.update(id, diagramData);
    
    // Update local version
    setCurrentVersion(response.data.version);
    setLastModified(response.data.lastModified);
    setSaveState(State.SAVED);
    
  } catch (error) {
    if (error.response?.status === 409) {
      // Conflict detected
      const serverData = error.response.data.currentVersion;
      
      showConflictDialog({
        localChanges: diagramData,
        serverVersion: serverData,
        onResolve: (resolution) => {
          if (resolution === 'keep-server') {
            loadDiagram(serverData.data);
          } else if (resolution === 'keep-local') {
            // Force save (update expectedVersion and retry)
            saveWithOverride(diagramData, serverData.version);
          } else if (resolution === 'merge') {
            // Show merge UI (advanced feature)
            showMergeInterface(diagramData, serverData.data);
          }
        }
      });
    } else {
      setSaveState(State.ERROR);
      toast.error('Failed to save diagram');
    }
  }
};
```

### Conflict Resolution UI

```javascript
// ConflictDialog Component
function ConflictDialog({ localChanges, serverVersion, onResolve, onClose }) {
  return (
    <Dialog open>
      <DialogTitle>Conflict Detected</DialogTitle>
      <DialogContent>
        <Alert severity="warning">
          This diagram was modified by {serverVersion.lastModifiedBy} at{' '}
          {new Date(serverVersion.lastModified).toLocaleString()}.
        </Alert>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            Your changes are from: {new Date(localChanges.lastModified).toLocaleString()}
          </Typography>
          <Typography variant="body2">
            Server version: {serverVersion.version}
          </Typography>
          <Typography variant="body2">
            Your version: {localChanges.expectedVersion}
          </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2">Resolution Options:</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button 
              variant="outlined" 
              onClick={() => onResolve('keep-server')}
            >
              Use Server Version (Discard My Changes)
            </Button>
            <Button 
              variant="outlined" 
              color="warning"
              onClick={() => onResolve('keep-local')}
            >
              Use My Version (Override Server)
            </Button>
            <Button 
              variant="outlined"
              onClick={() => onResolve('merge')}
            >
              View Differences & Merge
            </Button>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Polling for Updates

```javascript
// Check for updates every 30 seconds
useEffect(() => {
  if (!isAuthenticated || !diagramId) return;

  const interval = setInterval(async () => {
    try {
      const versionInfo = await diagramAPI.getVersion(diagramId);
      
      if (versionInfo.version > currentVersion) {
        // Show notification
        showUpdateNotification({
          message: `Diagram updated by ${versionInfo.lastModifiedBy}`,
          action: 'Reload',
          onAction: () => loadDiagram(diagramId)
        });
      }
    } catch (error) {
      console.error('Version check failed:', error);
    }
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [isAuthenticated, diagramId, currentVersion]);
```

---

## 11. Implementation Strategy

### Phase 1: Backend Setup & Docker (Week 1)
1. Set up PostgreSQL database
2. Create backend project structure
3. Implement models and migrations (including DiagramShare)
4. Create authentication endpoints
5. **Create Dockerfile and docker-compose.yml**
6. **Configure for port 9080**
7. Test authentication flow

### Phase 2: Core API & Collaboration (Week 2)
1. Implement diagram CRUD endpoints with version control
2. **Implement sharing and permissions endpoints**
3. **Add conflict detection logic**
4. Implement template endpoints
5. Add validation and error handling
6. Write unit tests
7. Test with Postman/Insomnia

### Phase 3: Frontend Integration (Week 3)
1. Create API service layer
2. Implement Auth Context
3. Create login/register UI
4. Update Workspace component with version tracking
5. **Create sharing UI components**
6. **Implement conflict resolution dialog**
7. **Add polling for real-time updates**
8. Test end-to-end flow

### Phase 4: Testing & Refinement (Week 4)
1. **Multi-user collaboration testing**
2. **Conflict resolution scenario testing**
3. **Performance testing (5-10 concurrent users)**
4. Security audit
5. Bug fixes and optimizations
6. Load testing

### Phase 5: Deployment to Azure (Week 5)
1. Set up Azure VM with Docker
2. Configure port 9080 and firewall rules
3. Deploy PostgreSQL container
4. Deploy API container
5. Configure automated backups
6. Set up monitoring and logging
7. Deploy frontend with production backend URL
8. Final integration testing
9. Documentation and handoff

---

## 12. Testing Requirements

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
- Test token refresh flow
- **Test conflict resolution UI**
- **Test sharing dialogs**
- **Test real-time update notifications**

### Collaboration Tests

```javascript
describe('Collaboration Features', () => {
  let user1Token, user2Token;
  let diagramId;
  
  beforeAll(async () => {
    // Create two test users
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    user1Token = user1.token;
    user2Token = user2.token;
  });

  test('Should share diagram with another user', async () => {
    // User 1 creates diagram
    const createResponse = await request(app)
      .post('/api/v1/diagrams')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Shared Diagram', database: 'postgresql' });
    
    diagramId = createResponse.body.id;

    // User 1 shares with User 2
    const shareResponse = await request(app)
      .post(`/api/v1/diagrams/${diagramId}/share`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ 
        userId: user2.id, 
        permissionLevel: 'editor' 
      });
    
    expect(shareResponse.status).toBe(201);
  });

  test('Should detect conflicts when both users edit', async () => {
    // User 2 gets diagram
    const getResponse = await request(app)
      .get(`/api/v1/diagrams/${diagramId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    const version = getResponse.body.version;

    // User 1 updates
    await request(app)
      .put(`/api/v1/diagrams/${diagramId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ 
        name: 'Updated by User 1',
        expectedVersion: version
      });

    // User 2 tries to update with old version
    const conflictResponse = await request(app)
      .put(`/api/v1/diagrams/${diagramId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ 
        name: 'Updated by User 2',
        expectedVersion: version // Old version
      });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body.error).toBe('Conflict detected');
  });

  test('Should enforce permissions', async () => {
    // Change User 2 to viewer
    await request(app)
      .put(`/api/v1/diagrams/${diagramId}/shares/${user2.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ permissionLevel: 'viewer' });

    // User 2 tries to edit
    const editResponse = await request(app)
      .put(`/api/v1/diagrams/${diagramId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'Should fail' });

    expect(editResponse.status).toBe(403);
  });
});
```

---

## 13. Deployment Guide

### Docker Configuration

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port 9080
EXPOSE 9080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: drawdb-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-drawdb}
      POSTGRES_USER: ${DB_USER:-drawdb_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-EXEC", "pg_isready -U ${DB_USER:-drawdb_user}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - drawdb-network

  api:
    build: .
    container_name: drawdb-api
    ports:
      - "9080:9080"
    environment:
      NODE_ENV: production
      PORT: 9080
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-drawdb}
      DB_USER: ${DB_USER:-drawdb_user}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - drawdb-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:9080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
    driver: local

networks:
  drawdb-network:
    driver: bridge
```

#### .env.production

```bash
# Database
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: GitHub Integration
GITHUB_TOKEN=your_github_token
```

### Azure VM Deployment

#### Prerequisites
1. Azure VM with Ubuntu 20.04+ or similar
2. Docker and Docker Compose installed
3. Port 9080 open in firewall
4. Domain name (optional) pointing to VM

#### Deployment Steps

**1. Connect to Azure VM**
```bash
ssh azureuser@your-vm-ip
```

**2. Install Docker and Docker Compose**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**3. Configure Firewall**
```bash
# Open port 9080
sudo ufw allow 9080/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
sudo ufw status
```

**4. Clone Repository**
```bash
cd /opt
sudo mkdir drawdb
sudo chown $USER:$USER drawdb
cd drawdb
git clone <your-repo-url> .
```

**5. Create Environment File**
```bash
# Create .env.production
cat > .env.production << EOF
DB_NAME=drawdb
DB_USER=drawdb_user
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
PORT=9080
EOF

# Secure the file
chmod 600 .env.production
```

**6. Deploy with Docker Compose**
```bash
# Build and start containers
docker-compose --env-file .env.production up -d

# Check logs
docker-compose logs -f

# Verify containers are running
docker-compose ps
```

**7. Initialize Database**
```bash
# Copy schema to postgres container
docker cp migrations/001_initial_schema.sql drawdb-postgres:/tmp/

# Run migration
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -f /tmp/001_initial_schema.sql

# Verify tables
docker exec drawdb-postgres psql -U drawdb_user -d drawdb -c "\dt"
```

**8. Test API**
```bash
# Health check
curl http://localhost:9080/health

# From external machine
curl http://your-vm-ip:9080/health
```

**9. Set Up Automated Backups**
```bash
# Create backup script
sudo mkdir -p /opt/drawdb/backups

cat > /opt/drawdb/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/drawdb/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/drawdb_backup_$TIMESTAMP.sql"

docker exec drawdb-postgres pg_dump -U drawdb_user drawdb > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/drawdb/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/drawdb/backup.sh") | crontab -
```

**10. Set Up Monitoring (Optional)**
```bash
# Install monitoring tools
sudo apt install -y htop iotop

# Set up log rotation
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

### Frontend Deployment

1. **Update Environment Variable**
   ```bash
   # .env.production
   VITE_BACKEND_URL=http://your-azure-vm-ip:9080
   # Or with domain:
   VITE_BACKEND_URL=https://api.yourdomain.com
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   # Deploy to Vercel/Netlify or Azure Static Web Apps
   vercel --prod
   # or
   az staticwebapp deploy
   ```

### SSL/HTTPS Setup (Recommended)

For production, set up HTTPS using Let's Encrypt:

```bash
# Install Nginx as reverse proxy
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
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

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
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

