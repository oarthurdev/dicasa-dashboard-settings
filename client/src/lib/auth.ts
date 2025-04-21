import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

// Types
export type User = {
  id: string;
  email: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

// Create a default context
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  user: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  isLoading: false,
  error: null,
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Helper to convert Supabase user to our app User type
const formatUser = (session: Session | null): User | null => {
  if (!session?.user) return null;
  
  const user = session.user;
  return {
    id: user.id,
    email: user.email || ""
  };
};

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check auth state on initial load
  useEffect(() => {
    const getUser = async () => {
      // Get session data
      const { data: { session } } = await supabase.auth.getSession();
      
      // Armazenar o token no localStorage se existir uma sessão
      if (session?.access_token) {
        localStorage.setItem("supabase.auth.token", session.access_token);
      } else {
        // Remover token se não existir sessão
        localStorage.removeItem("supabase.auth.token");
      }
      
      // Set the user if we have a session
      setUser(formatUser(session));
      setIsLoading(false);
      
      // Listen for auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        (_event, session) => {
          // Atualizar o token no localStorage quando a sessão mudar
          if (session?.access_token) {
            localStorage.setItem("supabase.auth.token", session.access_token);
          } else {
            localStorage.removeItem("supabase.auth.token");
          }
          
          setUser(formatUser(session));
          setIsLoading(false);
        }
      );
      
      // Cleanup the subscription
      return () => {
        subscription?.unsubscribe();
      };
    };
    
    getUser();
  }, []);
  
  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Armazenar o token no localStorage para uso nas requisições
      if (data.session?.access_token) {
        localStorage.setItem("supabase.auth.token", data.session.access_token);
      }
      
      setUser(formatUser(data.session));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      setError(error.message || "Falha na autenticação. Verifique suas credenciais.");
      setIsLoading(false);
      return false;
    }
  };
  
  // Register function
  const register = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Armazenar o token no localStorage para uso nas requisições
      if (data.session?.access_token) {
        localStorage.setItem("supabase.auth.token", data.session.access_token);
      }
      
      setUser(formatUser(data.session));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      setError(error.message || "Falha no registro. Tente novamente.");
      setIsLoading(false);
      return false;
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      // Remover o token do localStorage
      localStorage.removeItem("supabase.auth.token");
      setUser(null);
    } catch (error: any) {
      setError(error.message || "Erro ao fazer logout.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return React.createElement(AuthContext.Provider, {
    value: {
      isAuthenticated: !!user,
      user,
      login,
      register,
      logout,
      isLoading,
      error,
    }
  }, children);
}

// Auth Hook
export function useAuth() {
  return useContext(AuthContext);
}
