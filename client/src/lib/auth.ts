import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "./api";

interface User {
  id: number;
  email: string;
  nome: string;
  cargo: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("auth.token");
    const userData = localStorage.getItem("auth.user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Set token in API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        // Invalid stored data, clear it
        localStorage.removeItem("auth.token");
        localStorage.removeItem("auth.user");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      // Store token and user data
      localStorage.setItem("auth.token", token);
      localStorage.setItem("auth.user", JSON.stringify(userData));

      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Erro ao fazer login";
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth.token");
    localStorage.removeItem("auth.user");
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}