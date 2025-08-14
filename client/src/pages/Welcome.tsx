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
    <section className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema de configuração para o Dashboard de Ranking de Corretores
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.totalBrokers || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Corretores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.activeRules || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Regras Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <div className="flex items-center gap-2">
                    {stats?.kommoConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <p className="text-sm font-medium">
                      {stats?.kommoConnected ? "Conectado" : "Desconectado"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Status Kommo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium">
                    {stats?.nextSyncTime
                      ? new Date(stats.nextSyncTime).toLocaleTimeString("pt-BR")
                      : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Próxima Sync</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/rules")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                Gestão de Regras
              </CardTitle>
              <CardDescription>
                Configure regras de pontuação que afetam o ranking dos
                corretores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Criar e editar regras personalizadas</li>
                <li>• Definir valores de pontuação</li>
                <li>• Ativar/desativar regras por empresa</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Gerenciar Regras
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/settings/kommo")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                Integração Kommo
              </CardTitle>
              <CardDescription>
                Configure a conexão com a API da Kommo para sincronização de
                dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configurar credenciais de API</li>
                <li>• Selecionar funis para sincronização</li>
                <li>• Testar e monitorar conexão</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Configurar Kommo
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/monitoring")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                Monitoramento
              </CardTitle>
              <CardDescription>
                Acompanhe a sincronização de dados e visualize logs detalhados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Status de sincronização em tempo real</li>
                <li>• Logs detalhados de operações</li>
                <li>• Histórico de atualizações</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Ver Monitoramento
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/settings/company-branding")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Palette className="h-6 w-6 text-purple-600" />
                </div>
                Marca e Visual
              </CardTitle>
              <CardDescription>
                Personalize cores, logos e identidade visual do dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configurar cores do tema</li>
                <li>• Upload de logo e favicon</li>
                <li>• Personalizar títulos e textos</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Personalizar Visual
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/settings/dynamic-metrics")}
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
            onClick={() => navigate("/settings/general")}
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

              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Sincronização</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.lastSyncStatus || "Aguardando próxima execução"}
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
