import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

type AuthWrapperProps = {
  children: ReactNode;
};

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate("/admin/login");
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Floating Orbs Background */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth bg-transparent backdrop-blur-sm">
        <div className="min-h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
