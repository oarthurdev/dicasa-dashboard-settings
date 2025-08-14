import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Activity,
  Settings,
  BarChart3,
  Palette,
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import api from "@/lib/api";

interface DashboardStats {
  totalRules: number;
  activeRules: number;
  totalBrokers: number;
  lastSyncStatus: string;
  nextSyncTime: string;
  kommoConnected: boolean;
}

export default function Welcome() {
  const [_, navigate] = useLocation();
  const token = localStorage.getItem("auth.token");

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/api/dashboard-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <section className="h-full overflow-y-auto scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-6 py-12">
          <div className="relative">
            <h1
              className="text-6xl font-bold text-glow mb-4"
              data-text="Painel Administrativo"
            >
              Painel Administrativo
            </h1>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div
              className="absolute -bottom-4 -left-4 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Sistema de configuração inteligente para o Dashboard de Ranking de
            Corretores
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Button
              className="btn-glow px-8 py-4 text-lg"
              onClick={() => navigate("/admin/rules")}
            >
              <Zap className="mr-2 h-5 w-5" />
              Configurar Regras
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card-hover group cursor-pointer relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="animate-pulse">⭯</span>
                  ) : (
                    stats?.totalBrokers || "—"
                  )}
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Corretores
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl"></div>
          </div>

          <div className="card-hover group cursor-pointer relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="animate-pulse">⭯</span>
                  ) : (
                    stats?.activeRules || "—"
                  )}
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Regras Ativas
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
          </div>

          <div className="card-hover group cursor-pointer relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-8 w-8 text-orange-400" />
              </div>
              <div className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  {isLoading ? (
                    <span className="animate-pulse text-lg">⭯</span>
                  ) : stats?.kommoConnected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <p className="text-lg font-bold text-emerald-400">
                        Conectado
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <p className="text-lg font-bold text-red-400">Offline</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Status Kommo
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Enhanced Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="card-hover group cursor-pointer rounded-2xl p-6 relative overflow-hidden"
            onClick={() => navigate("/admin/rules")}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-primary/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Gestão de Regras
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Sistema de pontuação
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Configure regras de pontuação que afetam o ranking dos
                corretores
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Criar e editar regras personalizadas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Definir valores de pontuação
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Ativar/desativar regras por empresa
                </li>
              </ul>
              <Button className="w-full btn-glow">Gerenciar Regras</Button>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          </div>

          <div
            className="card-hover group cursor-pointer rounded-2xl p-6 relative overflow-hidden"
            onClick={() => navigate("/admin/settings/kommo")}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Integração Kommo
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Conexão de dados
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Configure a conexão com a API da Kommo para sincronização de
                dados
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Configurar credenciais de API
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Selecionar funis para sincronização
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Testar e monitorar conexão
                </li>
              </ul>
              <Button className="w-full" variant="outline">
                Configurar Kommo
              </Button>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
          </div>

          <div
            className="card-hover group cursor-pointer rounded-2xl p-6 relative overflow-hidden"
            onClick={() => navigate("/admin/settings/company-branding")}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-violet-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Palette className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Marca e Visual
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Identidade visual
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Personalize cores, logos e identidade visual do dashboard
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                  Configurar cores do tema
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                  Upload de logo e favicon
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                  Personalizar títulos e textos
                </li>
              </ul>
              <Button className="w-full" variant="outline">
                Personalizar Visual
              </Button>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl"></div>
          </div>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/admin/settings/dynamic-metrics")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                </div>
                Métricas Dinâmicas
              </CardTitle>
              <CardDescription>
                Configure métricas baseadas nos estágios dos funis da Kommo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Criar métricas por estágio</li>
                <li>• Definir valores mínimos</li>
                <li>• Configurar cores de alerta</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Configurar Métricas
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/admin/settings/general")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Configurações avançadas do sistema e preferências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configurações de notificação</li>
                <li>• Preferências do sistema</li>
                <li>• Backup e restauração</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Configurações
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Informações sobre o funcionamento do sistema de ranking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${stats?.kommoConnected ? "bg-green-500" : "bg-red-500"}`}
                />
                <div>
                  <p className="font-medium">Conexão Kommo</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.kommoConnected
                      ? "Funcionando normalmente"
                      : "Verificar configurações"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium">Banco de Dados</p>
                  <p className="text-sm text-muted-foreground">
                    Conectado e operacional
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
