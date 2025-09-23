import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Settings,
  BarChart3,
  LogOut,
  Target,
  Bell,
  FileText,
  Palette,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

type SidebarItemProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  href,
  icon,
  active,
  onClick,
  children,
}) => {
  return (
    <li>
      <Link href={href}>
        <a
          className={cn(
            "nav-item flex items-center px-4 py-3 mx-2 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-300 group relative",
            active && "text-primary bg-primary/10 shadow-md"
          )}
        >
          <span className={cn("mr-3 transition-all duration-300 group-hover:scale-110", active && "text-primary")}>
            {icon}
          </span>
          <span className="font-medium">{children}</span>
          {active && (
            <div className="absolute right-2 w-2 h-2 bg-primary rounded-full shadow-glow pulse-glow"></div>
          )}
        </a>
      </Link>
    </li>
  );
};

export default function Sidebar() {
  const { logout } = useAuth();
  const [location] = useLocation();

  return (
    <aside className="w-72 card-glass flex flex-col h-full border-r border-white/10">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-glow" data-text="Dashboard Config">Dashboard Config</h1>
        <p className="text-sm text-muted-foreground mt-1">Painel de Configuração</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-2">
          <SidebarItem
            href="/admin/welcome"
            icon={<Home size={20} />}
            active={location === "/admin/welcome" || location === "/admin"}
          >
            Boas-vindas
          </SidebarItem>
          <SidebarItem
            href="/admin/rules"
            icon={<BookOpen size={20} />}
            active={location === "/admin/rules"}
          >
            Regras
          </SidebarItem>
          <SidebarItem
            href="/admin/settings/dynamic-metrics"
            icon={<Target size={20} />}
            active={location === "/admin/settings/dynamic-metrics"}
          >
            Métricas Dinâmicas
          </SidebarItem>
          <SidebarItem
            href="/admin/notifications"
            icon={<Bell size={20} />}
            active={location === "/admin/notifications"}
          >
            Notificações
          </SidebarItem>
          <li>
            <Collapsible>
              <CollapsibleTrigger className="nav-item flex items-center w-full px-4 py-3 mx-2 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-300 group">
                <span className="mr-3 transition-all duration-300 group-hover:scale-110">
                  <Settings size={20} />
                </span>
                <span className="font-medium">Configurações</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="pl-4 mt-3 space-y-2">
                  <SidebarItem
                    href="/admin/settings/general"
                    icon={<Settings size={16} />}
                    active={location === "/admin/settings/general"}
                  >
                    Geral
                  </SidebarItem>
                  <SidebarItem
                    href="/admin/settings/kommo"
                    icon={<Settings size={16} />}
                    active={location === "/admin/settings/kommo"}
                  >
                    Kommo
                  </SidebarItem>
                  <SidebarItem
                    href="/admin/settings/alerts"
                    icon={<AlertTriangle size={16} />}
                    active={location === "/admin/settings/alerts"}
                  >
                    Alertas
                  </SidebarItem>
                  <SidebarItem
                    href="/admin/settings/reports"
                    icon={<FileText size={16} />}
                    active={location === "/admin/settings/reports"}
                  >
                    Relatórios
                  </SidebarItem>
                  <SidebarItem
                    href="/admin/settings/company-branding"
                    icon={<Palette size={16} />}
                    active={location === "/admin/settings/company-branding"}
                  >
                    Marca
                  </SidebarItem>
                  <SidebarItem
                    href="/admin/settings/auth-system"
                    icon={<Shield size={16} />}
                    active={location === "/admin/settings/auth-system"}
                  >
                    Sistema de Auth
                  </SidebarItem>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </li>
        </ul>
      </nav>

      <div className="p-6 border-t border-white/10">
        <Button
          variant="ghost"
          className="nav-item flex items-center w-full justify-start px-4 py-3 mx-0 rounded-xl text-muted-foreground hover:text-destructive transition-all duration-300 group hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="mr-3 h-4 w-4 transition-all duration-300 group-hover:scale-110" />
          <span className="font-medium">Sair</span>
        </Button>
      </div>
    </aside>
  );
}
