import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dynamicMetricFormSchema, type DynamicMetric, type MetricResult } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Database,
  Activity,
  BarChart3
} from "lucide-react";
import type { z } from "zod";
import api from "@/lib/api";

type FormValues = z.infer<typeof dynamicMetricFormSchema>;

interface MetricWithResult extends DynamicMetric {
  current_result?: MetricResult;
}

export default function DynamicMetrics() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DynamicMetric | null>(null);
  const { toast } = useToast();

  const token = localStorage.getItem("auth.token");

  // Fetch pipeline stages from selected pipelines
  const { data: pipelineStages = [] } = useQuery<
    Array<{ id: number; name: string; pipeline_id: number; pipeline_name: string }>
  >({
    queryKey: ["/api/kommo/pipeline-stages"],
    queryFn: async () => {
      const res = await api.get("/api/kommo/pipeline-stages", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
    enabled: !!token,
  });

  // Fetch existing metrics with their current results
  const { data: metrics = [], isLoading } = useQuery<MetricWithResult[]>({
    queryKey: ["/api/dynamic-metrics-with-results"],
    queryFn: async () => {
      const res = await api.get("/api/dynamic-metrics-with-results", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
    enabled: !!token,
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(dynamicMetricFormSchema),
    defaultValues: {
      nome: "",
      pipeline_stage_id: 0,
      pipeline_stage_name: "",
      valor_minimo: 1,
      cor_sucesso: "#22c55e",
      cor_alerta: "#ef4444",
      active: true,
    },
  });

  // Watch selected stage to auto-fill stage name
  const selectedStageId = form.watch("pipeline_stage_id");
  const selectedStage = pipelineStages.find(stage => stage.id === selectedStageId);
  
  // Auto-fill stage name when stage is selected
  React.useEffect(() => {
    if (selectedStage) {
      form.setValue("pipeline_stage_name", selectedStage.name);
    }
  }, [selectedStage, form]);

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Mutation called with data:", data);
      console.log("Token:", token);
      console.log("Company ID:", localStorage.getItem("selected_company"));
      
      const res = await api.post("/api/dynamic-metrics", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics-with-results"] });
      toast({
        title: "Métrica criada",
        description: "A métrica dinâmica foi criada com sucesso.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar métrica",
        description: error.response?.data?.message || "Erro interno do servidor.",
        variant: "destructive",
      });
    },
  });

  // Update metric mutation
  const updateMetricMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormValues> }) => {
      const res = await api.patch(`/api/dynamic-metrics/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics-with-results"] });
      toast({
        title: "Métrica atualizada",
        description: "A métrica dinâmica foi atualizada com sucesso.",
      });
      setEditingMetric(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar métrica",
        description: error.response?.data?.message || "Erro interno do servidor.",
        variant: "destructive",
      });
    },
  });

  // Delete metric mutation
  const deleteMetricMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dynamic-metrics/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics-with-results"] });
      toast({
        title: "Métrica excluída",
        description: "A métrica dinâmica foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir métrica",
        description: error.response?.data?.message || "Erro interno do servidor.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Is form valid:", form.formState.isValid);
    
    if (editingMetric) {
      updateMetricMutation.mutate({ id: editingMetric.id, data });
    } else {
      createMetricMutation.mutate(data);
    }
  };

  const getStatusBadge = (metric: MetricWithResult) => {
    if (!metric.current_result) {
      return <Badge variant="outline">Aguardando cálculo</Badge>;
    }

    const result = metric.current_result;
    const isSuccess = result.atingiu_meta;

    return (
      <Badge 
        variant={isSuccess ? "default" : "destructive"}
        className={isSuccess ? "bg-green-500" : "bg-red-500"}
      >
        {isSuccess ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Meta atingida
          </>
        ) : (
          <>
            <AlertCircle className="h-3 w-3 mr-1" />
            Abaixo da meta
          </>
        )}
      </Badge>
    );
  };

  const getProgressPercentage = (metric: MetricWithResult) => {
    if (!metric.current_result) return 0;
    return Math.min(100, (metric.current_result.valor_atual / metric.valor_minimo) * 100);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Métricas Dinâmicas
              </h1>
              <p className="text-muted-foreground">
                Configure métricas baseadas nos estágios dos funis da Kommo. Os valores atuais são calculados pelo projeto de ranking.
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Métrica
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingMetric ? "Editar Métrica" : "Nova Métrica Dinâmica"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure uma métrica baseada em estágios do funil da Kommo.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Métrica</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Leads Qualificados" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pipeline_stage_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estágio do Funil</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um estágio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pipelineStages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id.toString()}>
                                  {stage.pipeline_name} - {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Estágio do funil onde a métrica será calculada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_minimo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Mínimo</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Quantidade mínima de leads necessária para atingir a meta
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cor_sucesso"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Sucesso</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                              </FormControl>
                              <FormControl>
                                <Input className="flex-1" {...field} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cor_alerta"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Alerta</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                              </FormControl>
                              <FormControl>
                                <Input className="flex-1" {...field} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createMetricMutation.isPending || updateMetricMutation.isPending}>
                        {createMetricMutation.isPending || updateMetricMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="configuration">Configuração</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-2 w-full mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </CardContent>
                    </Card>
                  ))
                ) : metrics.length > 0 ? (
                  metrics.map((metric) => (
                    <Card key={metric.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{metric.nome}</CardTitle>
                          {getStatusBadge(metric)}
                        </div>
                        <CardDescription>
                          {metric.pipeline_stage_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">
                              {metric.current_result?.valor_atual || 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Meta: {metric.valor_minimo}
                            </span>
                          </div>
                          
                          <Progress 
                            value={getProgressPercentage(metric)} 
                            className="h-2"
                          />
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {metric.current_result?.leads_count || 0} leads
                            </div>
                            {metric.current_result?.calculado_em && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(metric.current_result.calculado_em).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma métrica configurada</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Crie sua primeira métrica dinâmica para monitorar o desempenho dos estágios do funil.
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Métrica
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary Section */}
              {metrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Resumo das Métricas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {metrics.filter(m => m.current_result?.atingiu_meta).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Metas Atingidas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {metrics.filter(m => m.current_result && !m.current_result.atingiu_meta).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Abaixo da Meta</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {metrics.filter(m => !m.current_result).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Aguardando Cálculo</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="configuration">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração das Métricas</CardTitle>
                  <CardDescription>
                    Gerencie as configurações das métricas dinâmicas. Os valores atuais são calculados automaticamente pelo projeto de ranking.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Meta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : metrics.length > 0 ? (
                        metrics.map((metric) => (
                          <TableRow key={metric.id}>
                            <TableCell className="font-medium">{metric.nome}</TableCell>
                            <TableCell>{metric.pipeline_stage_name}</TableCell>
                            <TableCell>{metric.valor_minimo}</TableCell>
                            <TableCell>
                              <Badge variant={metric.active ? "default" : "secondary"}>
                                {metric.active ? "Ativa" : "Inativa"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingMetric(metric);
                                    form.reset({
                                      nome: metric.nome,
                                      pipeline_stage_id: metric.pipeline_stage_id,
                                      pipeline_stage_name: metric.pipeline_stage_name,
                                      valor_minimo: metric.valor_minimo,
                                      cor_sucesso: metric.cor_sucesso || "#22c55e",
                                      cor_alerta: metric.cor_alerta || "#ef4444",
                                      active: metric.active ?? true,
                                    });
                                    setIsCreateDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMetricMutation.mutate(metric.id)}
                                  disabled={deleteMetricMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center">
                              <Target className="h-12 w-12 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">Nenhuma métrica configurada</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}