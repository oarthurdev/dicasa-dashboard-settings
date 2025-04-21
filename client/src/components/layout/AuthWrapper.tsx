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
    navigate("/login");
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
