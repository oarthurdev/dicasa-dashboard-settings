import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield, Key, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authSystemFormSchema } from "@shared/schema";
import { z } from "zod";

type AuthSystemFormData = z.infer<typeof authSystemFormSchema>;

export default function AuthSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("auth.token");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/admin/api/auth-system"],
    queryFn: () => apiRequest("/admin/api/auth-system"),
  });

  const form = useForm<AuthSystemFormData>({
    resolver: zodResolver(authSystemFormSchema),
    defaultValues: {
      password: "",
      expire_at: "",
    },
  });

  // Update form when data loads
  React.useEffect(() => {
    if (settings) {
      form.reset({
        password: "", // Never populate password field for security
        expire_at: settings.expire_at ? new Date(settings.expire_at).toISOString().split('T')[0] : "",
      });
    }
  }, [settings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: (data: AuthSystemFormData) =>
      fetch("/admin/api/auth-system", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/api/auth-system"],
      });
      toast({
        title: "Configurações salvas",
        description:
          "As configurações do sistema de autenticação foram atualizadas com sucesso",
      });
      // Clear password field after successful save
      form.setValue("password", "");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AuthSystemFormData) => {
    // Convert date string to ISO format for backend
    const submitData = {
      ...data,
      expire_at: new Date(data.expire_at + "T23:59:59Z").toISOString(),
    };
    saveSettingsMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Sistema de Autenticação
        </h1>
        <p className="text-muted-foreground">
          Configure a senha e data de expiração para o sistema de autenticação
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Senha do Sistema
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite a nova senha"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Defina uma senha segura para o sistema de autenticação. Mínimo de 6 caracteres.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expire_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Expiração
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormDescription>
                      Defina quando a autenticação atual deve expirar. Após esta data, será necessário redefinir as credenciais.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {settings && settings.expire_at && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Expiração atual:</strong> {new Date(settings.expire_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={saveSettingsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveSettingsMutation.isPending}>
              {saveSettingsMutation.isPending
                ? "Salvando..."
                : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}