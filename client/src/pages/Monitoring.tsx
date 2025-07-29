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
  Activity,
  Database,
  Zap,
  FileText,
  TrendingUp,
  AlertTriangle,
  Info
} from "lucide-react";
import { formatDate, getTimeRemaining } from "@/lib/dateUtils";
import api from "@/lib/api";

export default function Monitoring() {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");

  const token = localStorage.getItem("supabase.auth.token");

  // Fetch sync status
  interface SyncStatus {
    nextSync: string | null;
    status: string;
    lastSync: string | null;
    rulesCount: number;
    totalBrokers: number;
    activeConnections: number;
    avgSyncTime: number;
  }

  interface DetailedSyncLog extends SyncLog {
    execution_time?: number;
    affected_records?: number;
    error_details?: string;
    operation_type?: string;
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
  } = useQuery<DetailedSyncLog[]>({
    queryKey: ["/api/sync-logs-detailed", refreshCounter],
    queryFn: async () => {
      const res = await api.get("/api/sync-logs-detailed", {
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
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "SUCCESS":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "ERROR":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "DEBUG":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "INFO":
        return <Info className="h-4 w-4" />;
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground mb-6">
              Monitoramento do Sistema
            </h1>
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 pt-0">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Enhanced Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status da Sincronização
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isStatusLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
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
                            Desconectado
                          </span>
                        </>
                      )}
                    </div>
                    {syncStatus?.lastSync && (
                      <p className="text-xs text-muted-foreground">
                        Última sincronização: {new Date(syncStatus.lastSync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Sync Card */}
            <Card>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Próxima Sincronização
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isStatusLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-foreground">
                      {timeRemaining || "—"}
                    </div>
                    {syncStatus?.nextSync && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(syncStatus.nextSync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rules Count Card */}
            <Card>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Regras Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isStatusLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-foreground">
                      {syncStatus?.rulesCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Regras configuradas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isStatusLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-foreground">
                      {syncStatus?.avgSyncTime ? `${syncStatus.avgSyncTime}s` : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tempo médio de sincronização
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Logs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs Detalhados do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Horário</th>
                      <th className="text-left p-4 font-medium">Tipo</th>
                      <th className="text-left p-4 font-medium">Operação</th>
                      <th className="text-left p-4 font-medium">Mensagem</th>
                      <th className="text-left p-4 font-medium">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLogsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                          <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                        </tr>
                      ))
                    ) : syncLogs && syncLogs.length > 0 ? (
                      syncLogs.map((log: DetailedSyncLog) => (
                        <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className={`${getLogTypeColor(log.type)} flex items-center gap-1`}
                            >
                              {getLogIcon(log.type)}
                              {log.type}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium">
                              {log.operation_type || "Sistema"}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            <div className="max-w-md">
                              <p className="truncate">{log.message}</p>
                              {log.error_details && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {log.error_details}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            <div className="space-y-1">
                              {log.execution_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {log.execution_time}ms
                                </div>
                              )}
                              {log.affected_records && (
                                <div className="flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  {log.affected_records} registros
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t p-4 bg-muted/20">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Logs são atualizados automaticamente a cada 30 segundos
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshData}
                    className="text-primary"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Atualizar agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Conectividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Kommo</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${syncStatus?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-muted-foreground">
                        {syncStatus?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Banco de Dados</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Conectado</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sistema de Sincronização</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total de Corretores</span>
                    <span className="font-medium">{syncStatus?.totalBrokers || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Conexões Ativas</span>
                    <span className="font-medium">{syncStatus?.activeConnections || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Logs Registrados</span>
                    <span className="font-medium">{syncLogs?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}