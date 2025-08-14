import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rule } from "@shared/schema";
import RulesTable from "@/components/rules/RulesTable";
import CompanyRulesTable from "@/components/rules/CompanyRulesTable";
import DeleteRuleModal from "@/components/rules/DeleteRuleModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useState } from "react";
import { Loader2, RefreshCcw, Settings, Plus } from "lucide-react";
import api from "@/lib/api";

export default function Rules() {
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("auth.token");

  const rulesQueryKey = ["/api/rules"];

  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: paginatedData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...rulesQueryKey, currentPage],
    queryFn: async () => {
      const res = await api.get(`/api/rules?page=${currentPage}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
  });

  const rules = paginatedData?.rules || [];
  const pagination = paginatedData?.pagination;

  // Company Rules Query
  const companyRulesQuery = useQuery({
    queryKey: ["/api/company-rules"],
    queryFn: async () => {
      const res = await api.get("/api/company-rules", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/rules/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      toast({
        title: "Regra excluída",
        description: "A regra foi excluída com sucesso.",
        variant: "default",
      });
      setRuleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir regra",
        description:
          (error as any).response?.data.message ??
          "Ocorreu um erro ao excluir a regra, tente novamente.",
        variant: "destructive",
      });
      console.error("Error deleting rule:", error);
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ id, points }: { id: number; points: number }) => {
      await api.patch(
        `/api/rules/${id}/points`,
        { points },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      toast({
        title: "Pontos atualizados",
        description: "Os pontos foram atualizados com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar pontos",
        description:
          (error as any).response?.data.message ??
          "Ocorreu um erro ao atualizar os pontos. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error updating points:", error);
    },
  });

  const handleDeleteRule = (rule: Rule) => {
    setRuleToDelete(rule);
  };

  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id);
    }
  };

  const handleUpdatePoints = (rule: Rule, newPoints: number) => {
    updatePointsMutation.mutate({ id: rule.id, points: newPoints });
  };

  // Company Rules Mutations
  const updateCompanyRuleMutation = useMutation({
    mutationFn: async ({
      ruleId,
      points,
      isCustom,
    }: {
      ruleId: number;
      points: number;
      isCustom: boolean;
    }) => {
      if (isCustom) {
        await api.patch(
          `/api/custom-rules/${ruleId}`,
          { pontos: points },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        await api.post(
          "/api/company-rules",
          { rule_id: ruleId, pontos: points, active: true },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-rules"] });
      toast({
        title: "Pontos atualizados",
        description: "Os pontos da regra foram atualizados com sucesso.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar pontos",
        description:
          error.response?.data.message ??
          "Erro ao atualizar os pontos da regra.",
        variant: "destructive",
      });
    },
  });

  const createCustomRuleMutation = useMutation({
    mutationFn: async (data: {
      nome: string;
      pontos: number;
      descricao?: string;
    }) => {
      await api.post("/api/custom-rules", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-rules"] });
      toast({
        title: "Regra criada",
        description: "A regra personalizada foi criada com sucesso.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar regra",
        description:
          error.response?.data.message ??
          "Erro ao criar a regra personalizada.",
        variant: "destructive",
      });
    },
  });

  const deleteCustomRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await api.delete(`/api/custom-rules/${ruleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-rules"] });
      toast({
        title: "Regra excluída",
        description: "A regra personalizada foi excluída com sucesso.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir regra",
        description:
          error.response?.data.message ??
          "Erro ao excluir a regra personalizada.",
        variant: "destructive",
      });
    },
  });

  return (
    <section className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Gerenciamento de Regras
          </h1>
        </div>

        <Tabs defaultValue="company-rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="company-rules"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuração da Empresa
            </TabsTrigger>
            <TabsTrigger
              value="system-rules"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Regras do Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company-rules" className="mt-6">
            {companyRulesQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-60 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
            ) : companyRulesQuery.isError ? (
              <div className="text-center text-red-500 p-8">
                Erro ao carregar configurações de regras. Tente novamente.
              </div>
            ) : (
              <CompanyRulesTable
                rules={companyRulesQuery.data || []}
                onUpdateRulePoints={(ruleId, points, isCustom) =>
                  updateCompanyRuleMutation.mutate({ ruleId, points, isCustom })
                }
                onCreateCustomRule={(data) =>
                  createCustomRuleMutation.mutate(data)
                }
                onDeleteCustomRule={(ruleId) =>
                  deleteCustomRuleMutation.mutate(ruleId)
                }
                isLoading={
                  updateCompanyRuleMutation.isPending ||
                  createCustomRuleMutation.isPending ||
                  deleteCustomRuleMutation.isPending
                }
              />
            )}
          </TabsContent>

          <TabsContent value="system-rules" className="mt-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : isError ? (
                <div className="p-6 text-center text-red-500">
                  Erro ao carregar regras. Tente novamente.
                </div>
              ) : (
                <>
                  <RulesTable
                    rules={rules}
                    onDelete={handleDeleteRule}
                    onUpdatePoints={handleUpdatePoints}
                  />
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center mt-4 gap-2">
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DeleteRuleModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={confirmDeleteRule}
        isPending={deleteMutation.isPending}
      />
    </section>
  );
}
