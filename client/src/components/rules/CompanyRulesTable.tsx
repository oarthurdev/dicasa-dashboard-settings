import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Plus, Save, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompanyRule {
  id: number;
  nome: string;
  descricao?: string;
  pontos: number;
  company_pontos: number;
  has_custom_config: boolean;
  is_custom: boolean;
  coluna_nome?: string;
}

interface CompanyRulesTableProps {
  rules: CompanyRule[];
  onUpdateRulePoints: (ruleId: number, points: number, isCustom: boolean) => void;
  onCreateCustomRule: (data: { nome: string; pontos: number; descricao?: string }) => void;
  onDeleteCustomRule: (ruleId: number) => void;
  isLoading?: boolean;
}

export default function CompanyRulesTable({
  rules,
  onUpdateRulePoints,
  onCreateCustomRule,
  onDeleteCustomRule,
  isLoading = false
}: CompanyRulesTableProps) {
  const [editingRule, setEditingRule] = useState<CompanyRule | null>(null);
  const [newPoints, setNewPoints] = useState<number>(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRulePoints, setNewRulePoints] = useState<number>(0);
  const [newRuleDescription, setNewRuleDescription] = useState("");
  const { toast } = useToast();

  const generalRules = rules.filter(rule => !rule.is_custom);
  const customRules = rules.filter(rule => rule.is_custom);

  const handleEditPoints = (rule: CompanyRule) => {
    setEditingRule(rule);
    setNewPoints(rule.company_pontos);
  };

  const handleSavePoints = () => {
    if (editingRule) {
      if (newPoints < -100 || newPoints > 100) {
        toast({
          title: "Erro de validação",
          description: "Os pontos devem estar entre -100 e 100",
          variant: "destructive",
        });
        return;
      }
      onUpdateRulePoints(editingRule.id, newPoints, editingRule.is_custom);
      setEditingRule(null);
    }
  };

  const handleCreateCustomRule = () => {
    if (!newRuleName.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome da regra é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (newRulePoints < -100 || newRulePoints > 100) {
      toast({
        title: "Erro de validação",
        description: "Os pontos devem estar entre -100 e 100",
        variant: "destructive",
      });
      return;
    }

    onCreateCustomRule({
      nome: newRuleName,
      pontos: newRulePoints,
      descricao: newRuleDescription.trim() || undefined,
    });

    // Reset form
    setNewRuleName("");
    setNewRulePoints(0);
    setNewRuleDescription("");
    setIsCreateDialogOpen(false);
  };

  const handleDeleteCustomRule = (rule: CompanyRule) => {
    if (window.confirm(`Tem certeza que deseja excluir a regra "${rule.nome}"?`)) {
      onDeleteCustomRule(rule.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Regras Gerais do Sistema
          </CardTitle>
          <CardDescription>
            Configure os pontos específicos da sua empresa para as regras padrão do sistema.
            Valores personalizados substituem os valores padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Regra</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Pontos Padrão</TableHead>
                <TableHead className="text-center">Pontos da Empresa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generalRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma regra geral encontrada
                  </TableCell>
                </TableRow>
              ) : (
                generalRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.nome}</TableCell>
                    <TableCell className="max-w-xs truncate" title={rule.descricao}>
                      {rule.descricao || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{rule.pontos}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {editingRule?.id === rule.id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            min="-100"
                            max="100"
                            value={newPoints}
                            onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                          <Button
                            size="sm"
                            onClick={handleSavePoints}
                            disabled={isLoading}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRule(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant={rule.has_custom_config ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleEditPoints(rule)}
                        >
                          {rule.company_pontos}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.has_custom_config ? (
                        <Badge variant="default">Personalizado</Badge>
                      ) : (
                        <Badge variant="secondary">Padrão</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditPoints(rule)}
                        disabled={isLoading}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Custom Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Regras Personalizadas da Empresa
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Regra Personalizada</DialogTitle>
                  <DialogDescription>
                    Crie uma regra específica para sua empresa que será aplicada apenas aos seus dados.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rule-name">Nome da Regra</Label>
                    <Input
                      id="rule-name"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="Ex: Vendas Online"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-points">Pontos</Label>
                    <Input
                      id="rule-points"
                      type="number"
                      min="-100"
                      max="100"
                      value={newRulePoints}
                      onChange={(e) => setNewRulePoints(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-description">Descrição (Opcional)</Label>
                    <Textarea
                      id="rule-description"
                      value={newRuleDescription}
                      onChange={(e) => setNewRuleDescription(e.target.value)}
                      placeholder="Descreva quando esta regra deve ser aplicada..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCustomRule} disabled={isLoading}>
                    Criar Regra
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Regras criadas especificamente para sua empresa. Estas regras são aplicadas apenas aos seus dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Regra</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Pontos</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="h-8 w-8 text-muted-foreground/50" />
                      <p>Nenhuma regra personalizada criada ainda</p>
                      <p className="text-sm">Clique no botão "Nova Regra" para começar</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.nome}</TableCell>
                    <TableCell className="max-w-xs truncate" title={rule.descricao}>
                      {rule.descricao || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {editingRule?.id === rule.id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            min="-100"
                            max="100"
                            value={newPoints}
                            onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                          <Button
                            size="sm"
                            onClick={handleSavePoints}
                            disabled={isLoading}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRule(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => handleEditPoints(rule)}
                        >
                          {rule.company_pontos}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditPoints(rule)}
                          disabled={isLoading}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCustomRule(rule)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}