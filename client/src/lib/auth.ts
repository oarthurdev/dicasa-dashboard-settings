import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "./supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

// Create a default context
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  login: async () => false,
  logout: async () => {},
  isLoading: false,
  error: null,
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check auth state on initial load
  useEffect(() => {
    const getUser = async () => {
      // Get session data
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Armazenar o token no localStorage se existir uma sessão
      if (session?.access_token) {
        localStorage.setItem("supabase.auth.token", session.access_token);
      } else {
        // Remover token se não existir sessão
        localStorage.removeItem("supabase.auth.token");
      }

      // Set the user if we have a session
      setUser(session);
      setIsLoading(false);

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        // Atualizar o token no localStorage quando a sessão mudar
        if (session?.access_token) {
          localStorage.setItem("supabase.auth.token", session.access_token);
        } else {
          localStorage.removeItem("supabase.auth.token");
        }

        setUser(session);
        setIsLoading(false);
      });

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
        password,
      });

      if (error) {
        throw error;
      }

      // Armazenar o token no localStorage para uso nas requisições
      if (data.session?.access_token) {
        localStorage.setItem("supabase.auth.token", data.session.access_token);
      }

      setUser(data.session);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      setError(
        error.message || "Falha na autenticação. Verifique suas credenciais.",
      );
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
      localStorage.clear();
      setUser(null);
    } catch (error: any) {
      setError(error.message || "Erro ao fazer logout.");
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        error,
      },
    },
    children,
  );
}

// Auth Hook
export function useAuth() {
  return useContext(AuthContext);
}
