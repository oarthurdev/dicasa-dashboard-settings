import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyBrandingFormSchema, type CompanyBranding } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Save, Eye, Monitor, Sun, Moon } from "lucide-react";
import api from "@/lib/api";
import type { z } from "zod";

type FormValues = z.infer<typeof companyBrandingFormSchema>;

export default function CompanyBranding() {
  const { toast } = useToast();
  const token = localStorage.getItem("supabase.auth.token");

  // Fetch existing branding config
  const { data: branding, isLoading } = useQuery<CompanyBranding>({
    queryKey: ["/api/company-branding"],
    queryFn: async () => {
      const res = await api.get("/api/company-branding", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return res.data;
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(companyBrandingFormSchema),
    defaultValues: {
      primary_color: "#3b82f6",
      secondary_color: "#1e40af",
      accent_color: "#22c55e",
      logo_url: "",
      favicon_url: "",
      company_name_display: "",
      dashboard_title: "Ranking de Corretores",
      theme_mode: "light" as const,
    },
  });

  // Update form when branding is loaded
  useEffect(() => {
    if (branding) {
      form.reset({
        primary_color: branding.primary_color || "#3b82f6",
        secondary_color: branding.secondary_color || "#1e40af",
        accent_color: branding.accent_color || "#22c55e",
        logo_url: branding.logo_url || "",
        favicon_url: branding.favicon_url || "",
        company_name_display: branding.company_name_display || "",
        dashboard_title: branding.dashboard_title || "Ranking de Corretores",
        theme_mode: branding.theme_mode as "light" | "dark" | "auto" || "light",
      });
    }
  }, [branding, form]);

  // Save branding mutation
  const saveBrandingMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await api.post("/api/company-branding", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-ID": localStorage.getItem("selected_company") || "",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações de marca foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company-branding"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.message || "Erro ao salvar configurações.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    saveBrandingMutation.mutate(data);
  };

  const watchedColors = form.watch(["primary_color", "secondary_color", "accent_color"]);

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            Configurações de Marca
          </h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 pt-0">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Personalização da Marca
                </CardTitle>
                <CardDescription>
                  Configure as cores e elementos visuais do dashboard de ranking de corretores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Cores do Tema</h3>
                      
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Principal</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                              </FormControl>
                              <FormControl>
                                <Input className="flex-1" {...field} />
                              </FormControl>
                            </div>
                            <FormDescription>
                              Cor principal do sistema (botões, links, destaques)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Secundária</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                              </FormControl>
                              <FormControl>
                                <Input className="flex-1" {...field} />
                              </FormControl>
                            </div>
                            <FormDescription>
                              Cor secundária (hover, bordas, elementos secundários)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accent_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Destaque</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                              </FormControl>
                              <FormControl>
                                <Input className="flex-1" {...field} />
                              </FormControl>
                            </div>
                            <FormDescription>
                              Cor para sucessos, indicadores positivos
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-medium">Identidade Visual</h3>

                      <FormField
                        control={form.control}
                        name="company_name_display"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Empresa</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome para exibição no dashboard" />
                            </FormControl>
                            <FormDescription>
                              Nome que aparecerá no cabeçalho do dashboard
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dashboard_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título do Dashboard</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ranking de Corretores" />
                            </FormControl>
                            <FormDescription>
                              Título principal exibido no dashboard
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="logo_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do Logo</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://exemplo.com/logo.png" />
                            </FormControl>
                            <FormDescription>
                              URL do logo da empresa (formato PNG ou SVG recomendado)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="favicon_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do Favicon</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://exemplo.com/favicon.ico" />
                            </FormControl>
                            <FormDescription>
                              URL do ícone que aparece na aba do navegador
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="theme_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modo do Tema</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o modo do tema" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">
                                  <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4" />
                                    Claro
                                  </div>
                                </SelectItem>
                                <SelectItem value="dark">
                                  <div className="flex items-center gap-2">
                                    <Moon className="h-4 w-4" />
                                    Escuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="auto">
                                  <div className="flex items-center gap-2">
                                    <Monitor className="h-4 w-4" />
                                    Automático
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Escolha entre modo claro, escuro ou automático
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={saveBrandingMutation.isPending}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saveBrandingMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Preview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualização
                </CardTitle>
                <CardDescription>
                  Prévia de como as cores aparecerão no dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Paleta de Cores</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div 
                          className="w-full h-12 rounded border border-gray-200 mb-1"
                          style={{ backgroundColor: watchedColors[0] }}
                        />
                        <span className="text-sm text-muted-foreground">Principal</span>
                      </div>
                      <div className="text-center">
                        <div 
                          className="w-full h-12 rounded border border-gray-200 mb-1"
                          style={{ backgroundColor: watchedColors[1] }}
                        />
                        <span className="text-sm text-muted-foreground">Secundária</span>
                      </div>
                      <div className="text-center">
                        <div 
                          className="w-full h-12 rounded border border-gray-200 mb-1"
                          style={{ backgroundColor: watchedColors[2] }}
                        />
                        <span className="text-sm text-muted-foreground">Destaque</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Elementos do Dashboard</h4>
                    <div className="space-y-2">
                      <button 
                        className="px-4 py-2 rounded text-white font-medium"
                        style={{ backgroundColor: watchedColors[0] }}
                      >
                        Botão Principal
                      </button>
                      <div 
                        className="p-2 rounded border-l-4"
                        style={{ borderLeftColor: watchedColors[2] }}
                      >
                        Indicador de Sucesso
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: watchedColors[0] }}
                        />
                        <span className="text-sm">Status Ativo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}