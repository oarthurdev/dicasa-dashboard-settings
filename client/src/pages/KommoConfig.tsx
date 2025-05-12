import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { kommoConfigFormSchema } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import type { z } from "zod";
import type { KommoConfig } from "@shared/schema";
import api from "@/lib/api";

type FormValues = z.infer<typeof kommoConfigFormSchema>;

const BASE_URL = import.meta.env.VITE_API_URL;

export default function KommoConfig() {
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const navigate = (path: string) => {
    const { data: config } =
      queryClient.getQueryData<KommoConfig>(["/api/kommo-config"]) || {};
    if (!config?.api_url) {
      toast({
        title: "Configuração necessária",
        description: "Configure a integração com a Kommo antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    setLocation(path);
  };

  const token = localStorage.getItem("supabase.auth.token");

  // Fetch existing config
  const { data: config, isLoading } = useQuery<KommoConfig>({
    queryKey: ["/api/kommo-config"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/kommo-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(kommoConfigFormSchema),
    defaultValues: {
      api_url: "",
      access_token: "",
      sync_interval: 5,
      pipeline_id: "",
    },
  });

  const { data: pipelines = [] } = useQuery<
    Array<{ id: string; name: string }>
  >({
    queryKey: ["/api/kommo/pipelines"],
    queryFn: async () => {
      const res = await api.get("/api/kommo/pipelines", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    enabled: !!token,
  });

  // Update form when config is loaded
  useEffect(() => {
    if (config) {
      form.reset(
        {
          api_url: config.api_url,
          access_token: config.access_token,
          sync_interval: config.sync_interval ?? 5,
        },
        { keepValues: false },
      );
    }
  }, [config, form]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch(`${BASE_URL}/api/kommo-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save config");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kommo-config"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações da Kommo foram salvas com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar configurações",
        description:
          "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error saving config:", error);
    },
  });

  // Form submission
  const onSubmit = (data: FormValues) => {
    saveConfigMutation.mutate(data);
  };

  // Test connection
  const testConnection = async () => {
    const formData = form.getValues();
    setIsTestingConnection(true);

    try {
      const response = await fetch(`${BASE_URL}/api/kommo-config/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Connection test failed");

      toast({
        title: "Conexão estabelecida",
        description: "Conexão com a API Kommo testada com sucesso.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível estabelecer conexão com a API Kommo.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <section className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Configurações Kommo
        </h1>

        <Card className="bg-card rounded-lg shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="api_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da API da Kommo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>URL base da API da Kommo</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token de Acesso</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="flex-1 rounded-r-none"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-l-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                    </div>
                    <FormDescription>
                      Token de autenticação para acessar a API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo de Sincronização (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Frequência de atualização dos dados (padrão: 5 minutos)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início da Sincronização</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Data inicial para sincronização dos dados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Final da Sincronização</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Data final para sincronização dos dados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funil para sincronização</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Selecione um funil</option>
                        {pipelines.map((pipeline) => (
                          <option key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormDescription>
                      Selecione o funil que será usado para sincronização
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ativa</FormLabel>
                    <FormControl>
                      <Input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <FormDescription>
                      Ativa a sincronização dos dados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                        <span>Testando...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1 h-4 w-4" />
                        <span>Testar Conexão</span>
                      </>
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" type="button">
                        <Trash2 className="mr-1 h-4 w-4" />
                        Resetar Dashboard
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Excluir todos os dados?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá excluir permanentemente todos os dados
                          das tabelas brokers, broker_points, activities e
                          leads.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await api.post("/api/data/delete-all", null, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              });
                              toast({
                                title: "Dados excluídos",
                                description:
                                  "Todos os dados foram excluídos com sucesso.",
                              });
                            } catch (error) {
                              toast({
                                title: "Erro",
                                description: "Erro ao excluir dados.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Button
                  type="submit"
                  disabled={saveConfigMutation.isPending || isLoading}
                >
                  {saveConfigMutation.isPending
                    ? "Salvando..."
                    : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </section>
  );
}
