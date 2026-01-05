import { createContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../api/backend";

export const AuthContext = createContext(null);

export default function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Auth check failed:", error);
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
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  }, []);

  const register = useCallback(
    async (username, email, password) => {
      try {
        await authAPI.register(username, email, password);
        // Auto-login after registration
        return await login(email, password);
      } catch (error) {
        console.error("Registration failed:", error);
        return {
          success: false,
          error: error.response?.data?.message || "Registration failed",
        };
      }
    },
    [login],
  );

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



