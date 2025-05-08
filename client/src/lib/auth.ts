import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "./supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

// Types
export type User = {
  id: string;
  email: string;
  company_id?: number;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  registerWithCompany: (
    email: string,
    password: string,
    companyName: string,
  ) => Promise<boolean>;
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
  registerWithCompany: async () => false,
  logout: async () => {},
  isLoading: false,
  error: null,
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Helper to convert Supabase user to our app User type
const formatUser = async (session: Session | null): Promise<User | null> => {
  if (!session?.user) return null;

  const user = session.user;
  
  // Buscar informações adicionais do usuário no Supabase
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email || "",
    company_id: userData?.company_id
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
      setUser(formatUser(session));
      setIsLoading(false);

      // Listen for auth changes
      const {
        data: { subscription },
      } = await supabase.auth.onAuthStateChange((_event, session) => {
        // Atualizar o token no localStorage quando a sessão mudar
        if (session?.access_token) {
          localStorage.setItem("supabase.auth.token", session.access_token);
        } else {
          localStorage.removeItem("supabase.auth.token");
        }

        setUser(formatUser(session));
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

      setUser(formatUser(data.session));
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

  // Register with company function
  const registerWithCompany = async (
    email: string,
    password: string,
    companyName: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create company
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: companyName }])
        .select()
        .single();

      if (companyError || !companyData) {
        throw companyError || new Error("Failed to create company");
      }

      // Create user record
      const { error: userError } = await supabase.from("users").insert([
        {
          id: authData.user.id,
          company_id: companyData.id,
          role: "admin",
        },
      ]);

      if (userError) {
        throw userError;
      }

      if (authData.session?.access_token) {
        localStorage.setItem(
          "supabase.auth.token",
          authData.session.access_token,
        );
      }

      setUser(formatUser(authData.session));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      setError(error.message || "Falha no registro. Tente novamente.");
      setIsLoading(false);
      return false;
    }
  };

  // Register function (keeping for backward compatibility)
  const register = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    return registerWithCompany(email, password, email.split("@")[0]);
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

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        isAuthenticated: !!user,
        user,
        login,
        register,
        registerWithCompany,
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
