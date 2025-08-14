import { Switch, Route, useLocation as useWouterLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Welcome from "@/pages/Welcome";
import Rules from "@/pages/Rules";
import KommoConfig from "@/pages/KommoConfig";
import DynamicMetrics from "@/pages/DynamicMetrics";
import Monitoring from "@/pages/Monitoring";
import CompanyBranding from "@/pages/CompanyBranding";
import AuthWrapper from "@/components/layout/AuthWrapper";
import { useEffect } from "react";
import GeneralSettings from "@/pages/GeneralSettings";

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useWouterLocation();

  useEffect(() => {
    const enforceAuth = () => {
      if (!isAuthenticated) {
        if (location !== "/admin/login" && location !== "/admin/register") {
          setLocation("/admin/login");
        }
        return;
      }

      if (location === "/admin/login" || location === "/admin/register") {
        setLocation("/admin/welcome");
      }
    };

    enforceAuth();
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/admin/login" component={Login} />
        <Route path="/admin/register" component={Register} />
        <Route
          component={() => {
            setLocation("/admin/login");
            return null;
          }}
        />
      </Switch>
    );
  }

  return (
    <AuthWrapper>
      <Switch>
        <Route path="/admin" component={Welcome} />
        <Route path="/admin/welcome" component={Welcome} />
        <Route path="/admin/rules" component={Rules} />
        <Route
          path="/admin/settings/dynamic-metrics"
          component={DynamicMetrics}
        />
        <Route path="/admin/settings/general" component={GeneralSettings} />
        <Route path="/admin/settings/kommo" component={KommoConfig} />
        <Route
          path="/admin/settings/company-branding"
          component={CompanyBranding}
        />
        <Route path="/admin/monitoring" component={Monitoring} />
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