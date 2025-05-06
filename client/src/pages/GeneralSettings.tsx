import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient } from "@/lib/queryClient";
import api from "@/lib/api";

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

  if (isLoading) return <div>Carregando...</div>;

  return (
    <section className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Configurações Gerais
        </h1>

        <Card className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">
            Corretores na Dashboard
          </h2>
          <div className="space-y-4">
            {brokers?.map((broker) => (
              <div
                key={broker.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <span>{broker.nome}</span>
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
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
