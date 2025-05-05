import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SyncLog } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Cog,
} from "lucide-react";
import { formatDate, getTimeRemaining } from "@/lib/dateUtils";
import api from "@/lib/api";

export default function Monitoring() {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");

  const token = localStorage.getItem("supabase.auth.token");

  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
    refetchStatus();
    refetchLogs();
  };

  // Fetch sync status
  interface SyncStatus {
    nextSync: string | null;
    status: string;
    lastSync: string | null;
    rulesCount: number;
  }

  interface SyncLog {
    id: string;
    timestamp: string;
    type: string;
    message: string;
  }

  const {
    data: syncStatus,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery<SyncStatus>({
    queryKey: ["/api/sync-status", refreshCounter],
    queryFn: async () => {
      const res = await api.get("/api/sync-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
  });

  const {
    data: syncLogs,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useQuery<SyncLog[]>({
    queryKey: ["/api/sync-logs", refreshCounter],
    queryFn: async () => {
      const res = await api.get("/api/sync-logs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
  });
  // Update time remaining
  useEffect(() => {
    if (!syncStatus?.nextSync) return;

    const nextSync = new Date(syncStatus.nextSync);

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(nextSync));
    }, 1000);

    return () => clearInterval(interval);
  }, [syncStatus?.nextSync]);

  // Refresh data
  const refreshData = () => {
    setRefreshCounter((prev) => prev + 1);
    refetchStatus();
    refetchLogs();
  };

  // Get log badge color based on type
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "INFO":
        return "bg-green-100 text-green-800";
      case "DEBUG":
        return "bg-blue-100 text-blue-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <section className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Dashboard / Monitoramento
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Status Card */}
          <Card className="border-0 bg-card/90 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-medium">
                Status da Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isStatusLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center">
                  {syncStatus?.status === "connected" ? (
                    <>
                      <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
                      <span className="text-green-700 font-medium">
                        Conectado
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
                      <span className="text-red-700 font-medium">
                        Erro de conexão
                      </span>
                    </>
                  )}
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Última sincronização:{" "}
                <span className="font-medium">
                  {isStatusLoading ? (
                    <Skeleton className="h-4 w-28 inline-block" />
                  ) : (
                    formatDate(
                      syncStatus?.lastSync
                        ? new Date(syncStatus.lastSync)
                        : null,
                    )
                  )}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Next Update Card */}
          <Card className="border-0 bg-card/90 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-medium">
                Próxima Atualização
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isStatusLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center">
                  <Clock className="text-blue-500 mr-2 h-5 w-5" />
                  <span
                    className="text-gray-700 font-medium"
                    id="nextUpdateTime"
                  >
                    {timeRemaining}
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Agendada para:{" "}
                <span className="font-medium">
                  {isStatusLoading ? (
                    <Skeleton className="h-4 w-20 inline-block" />
                  ) : syncStatus?.nextSync ? (
                    new Date(syncStatus.nextSync).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    "N/A"
                  )}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card className="border-0 bg-card/90 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-medium">
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isStatusLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Registros Processados:
                    </span>
                    <span className="font-medium">
                      {syncStatus?.processedRecords || "..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Regras Aplicadas:
                    </span>
                    <span className="font-medium">
                      {syncStatus?.rulesCount || "..."}

                      {/* Performance Card */}
                      <Card className="border-0 bg-card/90 shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="space-y-1">
                          <CardTitle className="text-xl font-medium">
                            Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {isStatusLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                  Tempo Médio de Sync:
                                </span>
                                <span className="font-medium">
                                  {syncStatus?.avgSyncTime || "..."} s
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                  Uso de Memória:
                                </span>
                                <span className="font-medium">
                                  {syncStatus?.memoryUsage || "..."} MB
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                  Último Ciclo:
                                </span>
                                <span className="font-medium">
                                  {syncStatus?.lastCycleDuration || "..."} s
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Brokers Stats Card */}
                      <Card className="border-0 bg-card/90 shadow-md hover:shadow-lg transition-shadow md:col-span-2">
                        <CardHeader className="space-y-1">
                          <CardTitle className="text-xl font-medium">
                            Estatísticas dos Corretores
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {isStatusLoading ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">
                                    Total de Corretores:
                                  </span>
                                  <span className="font-medium">
                                    {syncStatus?.totalBrokers || "..."}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">
                                    Média de Leads:
                                  </span>
                                  <span className="font-medium">
                                    {syncStatus?.avgLeadsPerBroker || "..."}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">
                                    Propostas Totais:
                                  </span>
                                  <span className="font-medium">
                                    {syncStatus?.totalProposals || "..."}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">
                                    Vendas Totais:
                                  </span>
                                  <span className="font-medium">
                                    {syncStatus?.totalSales || "..."}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      Taxa de Sucesso:
                    </span>
                    <span className="font-medium text-green-600">
                      {syncStatus?.successRate
                        ? `${syncStatus.successRate}%`
                        : "..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Erros:</span>
                    <span className="font-medium text-red-600">
                      {syncStatus?.errorCount || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sync Logs Card */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-medium text-gray-700">Logs de Sincronização</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
              onClick={refreshData}
              disabled={isLogsLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLogsLoading ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </Button>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: "300px" }}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensagem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLogsLoading
                  ? Array(6)
                      .fill(0)
                      .map((_, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        </tr>
                      ))
                  : (syncLogs || []).map((log: SyncLog) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={getLogTypeColor(log.type)}
                          >
                            {log.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.message}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <Button variant="link" size="sm" className="text-primary-600 p-0">
              Ver todos os logs
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

{
  /* Quick Actions */
}
<Card className="mt-6">
  <div className="px-6 py-4 border-b border-gray-200">
    <h2 className="font-medium text-gray-700">Ações Rápidas</h2>
  </div>
  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
    <Button
      variant="outline"
      className="w-full"
      onClick={() => navigate("/rules")}
    >
      <Settings classrefreshDataName="mr-2 h-4 w-4" />
      Gerenciar Regras
    </Button>

    <Button
      variant="outline"
      className="w-full"
      onClick={() => navigate("/kommo-config")}
    >
      <Cog className="mr-2 h-4 w-4" />
      Configurar Kommo
    </Button>

    <Button variant="default" className="w-full" onClick={refreshData}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Atualizar Dados
    </Button>
  </div>
</Card>;
