
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";
import { Session, User } from "@supabase/supabase-js";

export namespace AuthContext {
  export type ContextType = {
    isAuthenticated: boolean;
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
  };
}

type AuthContextType = AuthContext.ContextType;

const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  user: null,
  login: async () => false,
  logout: async () => {},
  isLoading: false,
  error: null,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        localStorage.setItem("supabase.auth.token", session.access_token);
        setUser(session.user);
      } else {
        localStorage.removeItem("supabase.auth.token");
        setUser(null);
      }

      setIsLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          localStorage.setItem("supabase.auth.token", session.access_token);
          setUser(session.user);
        } else {
          localStorage.removeItem("supabase.auth.token");
          setUser(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription?.unsubscribe();
      };
    };

    getUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session?.access_token) {
        localStorage.setItem("supabase.auth.token", data.session.access_token);
      }

      setUser(data.user);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      setError(error.message || "Falha na autenticação. Verifique suas credenciais.");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("supabase.auth.token");
      setUser(null);
    } catch (error: any) {
      setError(error.message || "Erro ao fazer logout.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      login,
      logout,
      isLoading,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
