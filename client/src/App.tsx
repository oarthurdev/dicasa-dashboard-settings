import { Switch, Route, useLocation as useWouterLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Welcome from "@/pages/Welcome";
import Rules from "@/pages/Rules";
import KommoConfig from "@/pages/KommoConfig";
import Monitoring from "@/pages/Monitoring";
import AuthWrapper from "@/components/layout/AuthWrapper";
import { useEffect } from "react";
import GeneralSettings from "@/pages/GeneralSettings";
import CompanySelect from "@/pages/CompanySelect"; // Assuming CompanySelect is in pages

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useWouterLocation();

  const { data: kommoConfig, isLoading } = useQuery<KommoConfig>({
    queryKey: ["/api/kommo-config"],
    queryFn: async () => {
      const token = localStorage.getItem("supabase.auth.token");
      if (!token) throw new Error("No auth token");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/kommo-config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const enforceAuth = () => {
      // Se não autenticado, força ir para login
      if (!isAuthenticated) {
        if (location !== "/login" && location !== "/register") {
          setLocation("/login");
        }
        return;
      }

      // Se está carregando, não faz nada
      if (isLoading) return;

      // Se está no login ou register e está autenticado, redireciona para welcome
      if (location === "/login" || location === "/register") {
        setLocation("/welcome");
      }
    };

    enforceAuth();
  }, [isAuthenticated, location, setLocation, isLoading]);

  // Se não autenticado, mostra apenas rotas públicas
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={() => {
          setLocation("/login");
          return null;
        }} />
      </Switch>
    );
  }

  // Se autenticado mas sem config, mostra apenas config
  if (isAuthenticated && (!kommoConfig || !kommoConfig.api_url)) {
    return (
      <Switch>
        <Route
          path="/settings/kommo"
          component={() => (
            <AuthWrapper>
              <KommoConfig />
            </AuthWrapper>
          )}
        />
        <Route component={() => {
          setLocation("/settings/kommo");
          return null;
        }} />
      </Switch>
    );
  }

  // Autenticado e com config válida, mostra todas as rotas
  return (
    
    localStorage.getItem("selected_company") ? (
              <AuthWrapper>
                <Switch>
                  <Route path="/" component={Welcome} />
                  <Route
                    path="/welcome"
                    component={() => (
                      <AuthWrapper>
                        <Welcome />
                      </AuthWrapper>
                    )}
                  />
                  <Route
                    path="/rules"
                    component={() => (
                      <AuthWrapper>
                        <Rules />
                      </AuthWrapper>
                    )}
                  />
                  <Route
                    path="/settings/general"
                    component={() => (
                      <AuthWrapper>
                        <GeneralSettings />
                      </AuthWrapper>
                    )}
                  />
                  <Route
                    path="/settings/kommo"
                    component={() => (
                      <AuthWrapper>
                        <KommoConfig />
                      </AuthWrapper>
                    )}
                  />
                  <Route
                    path="/monitoring"
                    component={() => (
                      <AuthWrapper>
                        <Monitoring />
                      </AuthWrapper>
                    )}
                  />
                  <Route component={NotFound} />
                </Switch>
              </AuthWrapper>
            ) : (
              <Switch>
                <Route path="/" component={CompanySelect} />
                <Route component={CompanySelect} />
              </Switch>
            )
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;