import { Switch, Route, useLocation as useWouterLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { useQuery } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Welcome from "@/pages/Welcome";
import Rules from "@/pages/Rules";
import KommoConfig from "@/pages/KommoConfig";
import Monitoring from "@/pages/Monitoring";
import AuthWrapper from "@/components/layout/AuthWrapper";
import Sidebar from "@/components/layout/Sidebar";
import { useEffect } from "react";
import GeneralSettings from "@/pages/GeneralSettings"; // Placeholder - needs to be created

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useWouterLocation();
  const { data: kommoConfig, isLoading } = useQuery<KommoConfig>({
    queryKey: ["/api/kommo-config"],
    queryFn: async () => {
      const token = localStorage.getItem("supabase.auth.token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/kommo-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    // Redirect to login if not authenticated and not on register or login pages
    if (!isAuthenticated && location !== "/login" && location !== "/register") {
      setLocation("/login");
      return;
    }

    // Redirect to welcome page if authenticated and on login or register page
    if (isAuthenticated && (location === "/login" || location === "/register")) {
      setLocation("/welcome");
      return;
    }

    // Check for Kommo config and redirect if needed
    if (isAuthenticated && !isLoading && !kommoConfig?.api_url && location !== "/settings/kommo") {
      setLocation("/settings/kommo");
      return;
    }
  }, [isAuthenticated, location, setLocation, kommoConfig, isLoading]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <AuthWrapper><Welcome /></AuthWrapper>} />
      <Route path="/welcome" component={() => <AuthWrapper><Welcome /></AuthWrapper>} />
      <Route path="/rules" component={() => <AuthWrapper><Rules /></AuthWrapper>} />
      <Route path="/settings/general" component={() => <AuthWrapper><GeneralSettings /></AuthWrapper>} /> {/* Added route */}
      <Route path="/settings/kommo" component={() => <AuthWrapper><KommoConfig /></AuthWrapper>} /> {/* Modified route */}
      <Route path="/monitoring" component={() => <AuthWrapper><Monitoring /></AuthWrapper>} />
      <Route component={NotFound} />
    </Switch>
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