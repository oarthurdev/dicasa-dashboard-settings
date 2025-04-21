import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  BookOpen, 
  Settings, 
  BarChart3, 
  LogOut 
} from "lucide-react";

type SidebarItemProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
};

const SidebarItem = ({ href, icon, children, active }: SidebarItemProps) => {
  return (
    <li>
      <Link href={href}>
        <a 
          className={cn(
            "flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 pl-6",
            active && "bg-blue-50 text-blue-600 border-l-2 border-blue-600"
          )}
        >
          <span className={cn("mr-3 text-gray-500", active && "text-blue-600")}>
            {icon}
          </span>
          <span>{children}</span>
        </a>
      </Link>
    </li>
  );
};

export default function Sidebar() {
  const { logout } = useAuth();
  const [location] = useLocation();
  
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Dashboard Config</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          <SidebarItem 
            href="/welcome" 
            icon={<Home size={20} />} 
            active={location === "/welcome" || location === "/"}
          >
            Boas-vindas
          </SidebarItem>
          <SidebarItem 
            href="/rules" 
            icon={<BookOpen size={20} />} 
            active={location === "/rules"}
          >
            Regras
          </SidebarItem>
          <SidebarItem 
            href="/kommo-config" 
            icon={<Settings size={20} />} 
            active={location === "/kommo-config"}
          >
            Kommo Configurações
          </SidebarItem>
          <SidebarItem 
            href="/monitoring" 
            icon={<BarChart3 size={20} />} 
            active={location === "/monitoring"}
          >
            Dashboard / Monitoramento
          </SidebarItem>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="flex items-center text-gray-700 hover:text-gray-900 w-full justify-start px-2"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  );
}
