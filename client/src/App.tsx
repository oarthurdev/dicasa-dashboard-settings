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

const BASE_PATH = "/admin";

function withBase(path: string) {
  return `${BASE_PATH}${path}`;
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useWouterLocation();

  useEffect(() => {
    const enforceAuth = () => {
      if (!isAuthenticated) {
        if (location !== withBase("/login") && location !== withBase("/register")) {
          setLocation(withBase("/login"));
        }
        return;
      }

      if (location === withBase("/login") || location === withBase("/register")) {
        setLocation(withBase("/welcome"));
      }
    };

    enforceAuth();
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path={withBase("/login")} component={Login} />
        <Route path={withBase("/register")} component={Register} />
        <Route component={() => {
          setLocation(withBase("/login"));
          return null;
        }} />
      </Switch>
    );
  }

  return (
    <AuthWrapper>
      <Switch>
        <Route path={withBase("/")} component={Welcome} />
        <Route path={withBase("/welcome")} component={Welcome} />
        <Route path={withBase("/rules")} component={Rules} />
        <Route path={withBase("/settings/general")} component={GeneralSettings} />
        <Route path={withBase("/settings/kommo")} component={KommoConfig} />
        <Route path={withBase("/monitoring")} component={Monitoring} />
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
