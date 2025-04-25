
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rule } from "@shared/schema";
import RulesTable from "@/components/rules/RulesTable";
import DeleteRuleModal from "@/components/rules/DeleteRuleModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import { useState } from "react";

export default function Rules() {
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const token = localStorage.getItem("supabase.auth.token");

  const rulesQueryKey = ["/api/rules"];

  const { data: rules, isLoading, isError } = useQuery<Rule[]>({
    queryKey: rulesQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/rules", {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/rules/${id}`, {
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
        description: "Ocorreu um erro ao excluir a regra. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error deleting rule:", error);
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ id, points }: { id: number; points: number }) => {
      await axios.patch(`/api/rules/${id}/points`, { points }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
        description: "Ocorreu um erro ao atualizar os pontos. Tente novamente.",
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

  return (
    <section className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Regras</h1>
        </div>

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
            <RulesTable 
              rules={rules || []} 
              onDelete={handleDeleteRule}
              onUpdatePoints={handleUpdatePoints}
            />
          )}
        </div>
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
