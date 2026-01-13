import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Calendar,
  Mail,
  Settings,
  Download,
  Trash2,
  Play,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { automaticReportFormSchema } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

type AutomaticReportFormData = z.infer<typeof automaticReportFormSchema>;

interface AutomaticReport {
  id: number;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  report_type: "ranking" | "metrics" | "kommo_sync" | "full";
  email_recipients: string[];
  include_charts: boolean;
  include_comparisons: boolean;
  active: boolean;
  last_generated?: string;
  next_generation?: string;
  created_at: string;
}

const frequencyLabels = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

const reportTypeLabels = {
  ranking: "Ranking de Corretores",
  metrics: "Métricas Dinâmicas",
  kommo_sync: "Sincronização Kommo",
  full: "Relatório Completo",
};

export default function AutomaticReports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<AutomaticReport | null>(
    null,
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("auth.token");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/admin/api/automatic-reports"],
    queryFn: () => apiRequest("/admin/api/automatic-reports"),
  });

  const form = useForm<AutomaticReportFormData>({
    resolver: zodResolver(automaticReportFormSchema),
    defaultValues: {
      name: "",
      description: "",
      frequency: "weekly",
      report_type: "full",
      email_recipients: [],
      include_charts: true,
      include_comparisons: true,
      active: true,
    },
  });

  const createReportMutation = useMutation({
    mutationFn: (data: AutomaticReportFormData) =>
      fetch("/admin/api/automatic-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/api/automatic-reports"],
      });
      setDialogOpen(false);
      setEditingReport(null);
      form.reset();
      toast({
        title: "Relatório criado",
        description: "O relatório automático foi configurado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar relatório",
        variant: "destructive",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<AutomaticReport>;
    }) =>
      fetch(`/admin/api/automatic-reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/api/automatic-reports"],
      });
      toast({
        title: "Relatório atualizado",
        description: "As configurações foram salvas com sucesso",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/admin/api/automatic-reports/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/api/automatic-reports"],
      });
      toast({
        title: "Relatório excluído",
        description: "O relatório automático foi removido",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/admin/api/automatic-reports/${id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/api/automatic-reports"],
      });
      toast({
        title: "Relatório gerado",
        description: "O relatório foi gerado e enviado por email",
      });
    },
  });

  const handleOpenDialog = (report?: AutomaticReport) => {
    if (report) {
      setEditingReport(report);
      form.reset(report);
    } else {
      setEditingReport(null);
      form.reset();
    }
    setDialogOpen(true);
  };

  const onSubmit = (data: AutomaticReportFormData) => {
    createReportMutation.mutate(data);
  };

  const handleToggleActive = (report: AutomaticReport) => {
    updateReportMutation.mutate({
      id: report.id,
      data: { active: !report.active },
    });
  };

  // Email recipients management
  const [newEmail, setNewEmail] = useState("");
  const emailRecipients = form.watch("email_recipients") || [];

  const addEmailRecipient = () => {
    if (newEmail && !emailRecipients.includes(newEmail)) {
      form.setValue("email_recipients", [...emailRecipients, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmailRecipient = (email: string) => {
    form.setValue(
      "email_recipients",
      emailRecipients.filter((e) => e !== email),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios Automáticos
          </h1>
          <p className="text-muted-foreground">
            Configure relatórios que são gerados e enviados automaticamente
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReport
                  ? "Editar Relatório"
                  : "Novo Relatório Automático"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Relatório</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Relatório Semanal de Vendas"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o objetivo deste relatório..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="report_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Relatório</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">
                            Relatório Completo
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Recipients */}
                <div className="space-y-4">
                  <FormLabel>Destinatários de Email</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addEmailRecipient())
                      }
                    />
                    <Button
                      type="button"
                      onClick={addEmailRecipient}
                      variant="outline"
                    >
                      Adicionar
                    </Button>
                  </div>
                  {emailRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {emailRecipients.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {email}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeEmailRecipient(email)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createReportMutation.isPending}
                  >
                    {createReportMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios Configurados ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum relatório configurado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Configure relatórios automáticos para receber atualizações
                  regulares
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Relatório
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Última Geração</TableHead>
                    <TableHead>Próxima Geração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: AutomaticReport) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-muted-foreground">
                              {report.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reportTypeLabels[report.report_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{frequencyLabels[report.frequency]}</TableCell>
                      <TableCell>
                        {report.last_generated
                          ? format(
                              new Date(report.last_generated),
                              "dd/MM/yyyy HH:mm",
                              {
                                locale: ptBR,
                              },
                            )
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {report.next_generation
                          ? format(
                              new Date(report.next_generation),
                              "dd/MM/yyyy HH:mm",
                              {
                                locale: ptBR,
                              },
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={report.active ? "default" : "secondary"}
                        >
                          {report.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              generateReportMutation.mutate(report.id)
                            }
                            disabled={generateReportMutation.isPending}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(report)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              deleteReportMutation.mutate(report.id)
                            }
                            disabled={deleteReportMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
