import axios from "axios";

const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:9080";

const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  register: async (username, email, password) => {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });
    if (response.data.token) {
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  updateProfile: async (username, email) => {
    const response = await api.put("/auth/profile", { username, email });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put("/auth/password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// Diagram API
export const diagramAPI = {
  getAll: async () => {
    const response = await api.get("/diagrams");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/diagrams/${id}`);
    return response.data;
  },

  create: async (diagramData) => {
    const response = await api.post("/diagrams", diagramData);
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
    const response = await api.get("/diagrams/shared-with-me");
    return response.data;
  },
};

// Template API
export const templateAPI = {
  getAll: async () => {
    const response = await api.get("/templates");
    return response.data;
  },

  create: async (templateData) => {
    const response = await api.post("/templates", templateData);
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



