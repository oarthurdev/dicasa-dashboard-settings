import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info" | "alert";
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

const typeIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  alert: Bell,
};

const typeColors = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  alert:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const priorityColors = {
  low: "border-gray-200 dark:border-gray-700",
  normal: "border-blue-200 dark:border-blue-700",
  high: "border-orange-200 dark:border-orange-700",
  urgent: "border-red-200 dark:border-red-700",
};

export default function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("auth.token");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/admin/api/notifications", filter],
    queryFn: () =>
      apiRequest(
        `/admin/api/notifications?unread=${filter === "unread"}&limit=50`,
      ),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/admin/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      fetch("/admin/api/notifications/mark-all-read", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/notifications"] });
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });
    },
  });

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            Central de alertas e atualizações do sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {unreadCount} não lidas
          </Badge>
          <Button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            variant="outline"
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
        >
          Todas
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
          size="sm"
        >
          Não lidas
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === "unread"
                ? "Nenhuma notificação não lida"
                : "Nenhuma notificação"}
            </h3>
            <p className="text-muted-foreground">
              {filter === "unread"
                ? "Todas as suas notificações foram lidas"
                : "Você não possui notificações no momento"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: Notification) => {
            const IconComponent = typeIcons[notification.type];
            return (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.read
                    ? "ring-2 ring-blue-200 dark:ring-blue-800"
                    : ""
                } ${priorityColors[notification.priority]}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-full ${typeColors[notification.type]}`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">
                            {notification.title}
                            {!notification.read && (
                              <Badge variant="secondary" className="ml-2">
                                Nova
                              </Badge>
                            )}
                          </h3>
                          <p className="text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`capitalize ${
                              notification.priority === "urgent"
                                ? "text-red-600 border-red-300"
                                : notification.priority === "high"
                                  ? "text-orange-600 border-orange-300"
                                  : "text-gray-600 border-gray-300"
                            }`}
                          >
                            {notification.priority}
                          </Badge>

                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="capitalize">
                            {notification.category}
                          </span>
                          <span>
                            {format(
                              new Date(notification.created_at),
                              "dd 'de' MMMM 'às' HH:mm",
                              {
                                locale: ptBR,
                              },
                            )}
                          </span>
                        </div>

                        {notification.action_url && (
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 h-auto"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver mais
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
