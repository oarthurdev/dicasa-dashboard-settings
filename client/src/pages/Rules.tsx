import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Rule } from "@shared/schema";
import RulesTable from "@/components/rules/RulesTable";
import CreateRuleModal from "@/components/rules/CreateRuleModal";
import DeleteRuleModal from "@/components/rules/DeleteRuleModal";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Rules() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const { toast } = useToast();
  
  // Fetch rules
  const { data: rules, isLoading, isError } = useQuery({
    queryKey: ["/api/rules"],
  });
  
  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("supabase.auth.token");
      
      // Use o queryClient para fazer a requisição com o token
      await queryClient.fetchQuery({
        queryKey: [`/api/rules/${id}`],
        meta: {
          method: 'DELETE'
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
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
  
  const handleDeleteRule = (rule: Rule) => {
    setRuleToDelete(rule);
  };
  
  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id);
    }
  };
  
  return (
    <section className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Regras</h1>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="mr-1 h-4 w-4" />
            <span>Criar nova regra</span>
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <p className="text-gray-600">
              As regras definem as pontuações (-100 a +100) que serão aplicadas aos dados da dashboard. 
              Cada regra cria automaticamente uma coluna correspondente na tabela <code>broker_points</code>.
            </p>
          </div>
          
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
            />
          )}
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {isLoading 
                ? "Carregando regras..." 
                : `Exibindo ${rules?.length || 0} regra${rules?.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Create Rule Modal */}
      <CreateRuleModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      {/* Delete Rule Modal */}
      <DeleteRuleModal 
        isOpen={!!ruleToDelete} 
        onClose={() => setRuleToDelete(null)}
        onConfirm={confirmDeleteRule}
        isPending={deleteMutation.isPending}
      />
    </section>
  );
}
