import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ruleFormSchema } from "@shared/schema";
import { convertToSnakeCase } from "@/lib/stringUtils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FormValues = z.infer<typeof ruleFormSchema>;

type CreateRuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateRuleModal({ isOpen, onClose }: CreateRuleModalProps) {
  const { toast } = useToast();
  const [previewColumnName, setPreviewColumnName] = useState("");
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      points: 0,
      description: "",
    },
  });
  
  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/rules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Regra criada",
        description: "A regra foi criada com sucesso.",
        variant: "default",
      });
      onClose();
      form.reset({
        name: "",
        points: 0,
        description: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar regra",
        description: "Ocorreu um erro ao criar a regra. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error creating rule:", error);
    },
  });
  
  // Form submission
  const onSubmit = (data: FormValues) => {
    createRuleMutation.mutate(data);
  };
  
  // Update preview when name changes
  const updatePreview = (name: string) => {
    setPreviewColumnName(convertToSnakeCase(name));
  };
  
  // Get point value badge class based on value
  const getPointValueClass = (value: number) => {
    if (value < 0) return "bg-red-100 text-red-800";
    if (value > 0) return "bg-green-100 text-green-800";
    return "bg-gray-200 text-gray-800";
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Regra</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Regra</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Leads não respondidos em 5 dias" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updatePreview(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Coluna gerada: <code className="text-xs font-mono bg-gray-100 p-1 rounded">
                      {previewColumnName || "nome_da_regra"}
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de Pontos</FormLabel>
                  <div className="flex items-center space-x-4">
                    <FormControl>
                      <Slider
                        min={-100}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="flex-1"
                      />
                    </FormControl>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "min-w-[60px] text-center justify-center",
                        getPointValueClass(field.value)
                      )}
                    >
                      {field.value}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-100 (Penalização máxima)</span>
                    <span>+100 (Bonificação máxima)</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito desta regra..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createRuleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? "Salvando..." : "Salvar Regra"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
