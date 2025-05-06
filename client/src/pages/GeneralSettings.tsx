
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient } from "@/lib/queryClient";
import api from "@/lib/api";
import { Info } from "lucide-react";

type Broker = {
  id: number;
  name: string;
  cargo: string;
  active: boolean;
};

export default function GeneralSettings() {
  const { data: brokers, isLoading } = useQuery<Broker[]>({
    queryKey: ["brokers"],
    queryFn: async () => {
      const response = await api.get("/api/brokers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}`,
        },
      });
      return response.data;
    },
  });

  const updateBrokerMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await api.patch(
        `/api/brokers/${id}`,
        { active },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}`,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Configurações Gerais
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações gerais do sistema, incluindo a visibilidade dos corretores na dashboard.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2 rounded-full bg-blue-100">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Visibilidade dos Corretores</h2>
              <p className="text-sm text-muted-foreground">
                Controle quais corretores aparecerão na dashboard principal. 
                Ative ou desative a visibilidade de cada corretor usando os toggles abaixo.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {brokers?.map((broker) => (
              <div
                key={broker.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
              >
                <div>
                  <h3 className="font-medium">{broker.nome}</h3>
                  <p className="text-sm text-muted-foreground">{broker.cargo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">
                    {broker.active ? "Visível" : "Oculto"}
                  </span>
                  <Checkbox
                    checked={broker.active}
                    onCheckedChange={(checked) => {
                      updateBrokerMutation.mutate({
                        id: broker.id,
                        active: checked as boolean,
                      });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
