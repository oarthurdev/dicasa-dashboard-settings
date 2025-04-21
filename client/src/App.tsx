import { Switch, Route, useLocation } from "wouter";
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
import Sidebar from "@/components/layout/Sidebar";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to login if not authenticated and not on register or login pages
    if (!isAuthenticated && location !== "/login" && location !== "/register") {
      setLocation("/login");
    }
    
    // Redirect to welcome page if authenticated and on login or register page
    if (isAuthenticated && (location === "/login" || location === "/register")) {
      setLocation("/welcome");
    }
  }, [isAuthenticated, location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <AuthWrapper><Welcome /></AuthWrapper>} />
      <Route path="/welcome" component={() => <AuthWrapper><Welcome /></AuthWrapper>} />
      <Route path="/rules" component={() => <AuthWrapper><Rules /></AuthWrapper>} />
      <Route path="/kommo-config" component={() => <AuthWrapper><KommoConfig /></AuthWrapper>} />
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
