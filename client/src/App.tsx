import { Switch, Route, useLocation as useWouterLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
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

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useWouterLocation();

  useEffect(() => {
    const enforceAuth = () => {
      if (!isAuthenticated) {
        if (location !== "/login" && location !== "/register") {
          setLocation("/login");
        }
        return;
      }

      if (location === "/login" || location === "/register") {
        setLocation("/welcome");
      }
    };

    enforceAuth();
  }, [isAuthenticated, location, setLocation]);

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

  return (
    <AuthWrapper>
      <Switch>
        <Route path="/" component={Welcome} />
        <Route path="/welcome" component={Welcome} />
        <Route path="/rules" component={Rules} />
        <Route path="/settings/general" component={GeneralSettings} />
        <Route path="/settings/kommo" component={KommoConfig} />
        <Route path="/monitoring" component={Monitoring} />
        <Route component={NotFound} />
      </Switch>
    </AuthWrapper>
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