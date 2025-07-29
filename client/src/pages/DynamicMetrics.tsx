import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dynamicMetricFormSchema } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Target, TrendingUp, AlertCircle } from "lucide-react";
import type { z } from "zod";
import type { DynamicMetric } from "@shared/schema";
import api from "@/lib/api";

type FormValues = z.infer<typeof dynamicMetricFormSchema>;

export default function DynamicMetrics() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DynamicMetric | null>(null);
  const { toast } = useToast();

  const token = localStorage.getItem("supabase.auth.token");

  // Fetch pipeline stages from selected pipelines
  const { data: pipelineStages = [] } = useQuery<
    Array<{ id: number; name: string; pipeline_id: number; pipeline_name: string }>
  >({
    queryKey: ["/api/kommo/pipeline-stages"],
    queryFn: async () => {
      const res = await api.get("/api/kommo/pipeline-stages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    enabled: !!token,
  });

  // Fetch existing metrics
  const { data: metrics = [], isLoading } = useQuery<DynamicMetric[]>({
    queryKey: ["/api/dynamic-metrics"],
    queryFn: async () => {
      const res = await api.get("/api/dynamic-metrics", {
        headers: {
          Authorization: `Bearer ${token}`,
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

  // Create metric mutation
  const createMetricMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await api.post("/api/dynamic-metrics", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics"] });
      toast({
        title: "Métrica criada",
        description: "A métrica dinâmica foi criada com sucesso.",
        variant: "default",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar métrica",
        description: error.response?.data.message ?? "Erro ao criar a métrica dinâmica.",
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
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics"] });
      toast({
        title: "Métrica atualizada",
        description: "A métrica dinâmica foi atualizada com sucesso.",
        variant: "default",
      });
      setEditingMetric(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar métrica",
        description: error.response?.data.message ?? "Erro ao atualizar a métrica dinâmica.",
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
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-metrics"] });
      toast({
        title: "Métrica excluída",
        description: "A métrica dinâmica foi excluída com sucesso.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir métrica",
        description: error.response?.data.message ?? "Erro ao excluir a métrica dinâmica.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (editingMetric) {
      updateMetricMutation.mutate({ id: editingMetric.id, data });
    } else {
      createMetricMutation.mutate(data);
    }
  };

  const handleEdit = (metric: DynamicMetric) => {
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
  };

  const handleDelete = (metric: DynamicMetric) => {
    if (window.confirm(`Tem certeza que deseja excluir a métrica "${metric.nome}"?`)) {
      deleteMetricMutation.mutate(metric.id);
    }
  };

  const handleStageSelect = (stageId: string) => {
    const stage = pipelineStages.find(s => s.id === parseInt(stageId));
    if (stage) {
      form.setValue("pipeline_stage_id", stage.id);
      form.setValue("pipeline_stage_name", stage.name);
    }
  };

  // Mock current values for demonstration
  const getCurrentValue = (metric: DynamicMetric) => {
    // In real implementation, this would fetch actual data from Kommo
    return Math.floor(Math.random() * (metric.valor_minimo + 10));
  };

  const getStatusColor = (metric: DynamicMetric, currentValue: number) => {
    return currentValue >= metric.valor_minimo ? metric.cor_sucesso : metric.cor_alerta;
  };

  const getStatusIcon = (metric: DynamicMetric, currentValue: number) => {
    return currentValue >= metric.valor_minimo ? TrendingUp : AlertCircle;
  };

  return (
    <section className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Métricas Dinâmicas
            </h1>
            <p className="text-muted-foreground">
              Defina métricas baseadas em etapas do funil com indicadores visuais
            </p>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingMetric(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Métrica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMetric ? "Editar Métrica" : "Criar Nova Métrica"}
                </DialogTitle>
                <DialogDescription>
                  Configure uma métrica baseada em etapas do funil com valores mínimos e cores indicativas.
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
                          <Input {...field} placeholder="Ex: Conversões em Aquecendo" />
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
                        <FormLabel>Etapa do Funil</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={handleStageSelect}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma etapa do funil" />
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
                          Selecione a etapa do funil que será monitorada
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
                        <FormLabel>Valor Mínimo Esperado</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Valor mínimo para considerar a métrica como sucesso
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
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                {...field}
                                className="w-16 h-10 p-1"
                              />
                              <Input
                                {...field}
                                placeholder="#22c55e"
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
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
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                {...field}
                                className="w-16 h-10 p-1"
                              />
                              <Input
                                {...field}
                                placeholder="#ef4444"
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Métrica Ativa</FormLabel>
                          <FormDescription>
                            Marque para ativar o monitoramento desta métrica
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMetricMutation.isPending || updateMetricMutation.isPending
                      }
                    >
                      {editingMetric ? "Atualizar" : "Criar"} Métrica
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metrics
            .filter(metric => metric.active)
            .map((metric) => {
              const currentValue = getCurrentValue(metric);
              const statusColor = getStatusColor(metric, currentValue);
              const StatusIcon = getStatusIcon(metric, currentValue);
              const isSuccess = currentValue >= metric.valor_minimo;

              return (
                <Card key={metric.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{metric.nome}</CardTitle>
                      <StatusIcon
                        className="h-5 w-5"
                        style={{ color: statusColor }}
                      />
                    </div>
                    <CardDescription>{metric.pipeline_stage_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className="text-3xl font-bold"
                          style={{ color: statusColor }}
                        >
                          {currentValue}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mínimo: {metric.valor_minimo}
                        </div>
                      </div>
                      <Badge
                        variant={isSuccess ? "default" : "destructive"}
                        style={{
                          backgroundColor: statusColor,
                          color: "white",
                        }}
                      >
                        {isSuccess ? "Sucesso" : "Alerta"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Metrics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Todas as Métricas
            </CardTitle>
            <CardDescription>
              Gerencie todas as métricas dinâmicas configuradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Etapa do Funil</TableHead>
                  <TableHead className="text-center">Valor Atual</TableHead>
                  <TableHead className="text-center">Valor Mínimo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ativa</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Target className="h-8 w-8 text-muted-foreground/50" />
                        <p>Nenhuma métrica configurada ainda</p>
                        <p className="text-sm">Clique em "Nova Métrica" para começar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric) => {
                    const currentValue = getCurrentValue(metric);
                    const statusColor = getStatusColor(metric, currentValue);
                    const isSuccess = currentValue >= metric.valor_minimo;

                    return (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">{metric.nome}</TableCell>
                        <TableCell>{metric.pipeline_stage_name}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className="font-semibold"
                            style={{ color: statusColor }}
                          >
                            {currentValue}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{metric.valor_minimo}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isSuccess ? "default" : "destructive"}
                            style={{
                              backgroundColor: statusColor,
                              color: "white",
                            }}
                          >
                            {isSuccess ? "✓ Sucesso" : "⚠ Alerta"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={metric.active ? "default" : "secondary"}>
                            {metric.active ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(metric)}
                              disabled={
                                updateMetricMutation.isPending || deleteMetricMutation.isPending
                              }
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(metric)}
                              disabled={
                                updateMetricMutation.isPending || deleteMetricMutation.isPending
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}