
import { Rule } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

type RulesTableProps = {
  rules: Rule[];
  onDelete: (rule: Rule) => void;
  onUpdatePoints: (rule: Rule, newPoints: number) => void;
};

export default function RulesTable({ rules, onDelete, onUpdatePoints }: RulesTableProps) {
  const [editingPoints, setEditingPoints] = useState<{[key: number]: number}>({});

  const getPointsBadgeClass = (points: number) => {
    if (points < 0) return "bg-red-100 text-red-800";
    if (points > 0) return "bg-green-100 text-green-800";
    return "bg-gray-200 text-gray-800";
  };
  
  const formatPoints = (points: number) => {
    return points > 0 ? `+${points}` : points;
  };

  const handlePointsChange = (ruleId: number, points: number) => {
    setEditingPoints({ ...editingPoints, [ruleId]: points });
  };

  const handlePointsSave = (rule: Rule) => {
    const newPoints = editingPoints[rule.id];
    if (newPoints !== undefined && newPoints !== rule.pontos) {
      onUpdatePoints(rule, newPoints);
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome da Regra
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor de Pontos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rules.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                Nenhuma regra encontrada.
              </td>
            </tr>
          ) : (
            rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rule.nome}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4 min-w-[300px]">
                    <Slider
                      min={-100}
                      max={100}
                      step={5}
                      value={[editingPoints[rule.id] ?? rule.pontos]}
                      onValueChange={(values) => handlePointsChange(rule.id, values[0])}
                      className="flex-1"
                      onValueCommit={() => handlePointsSave(rule)}
                    />
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "min-w-[60px] text-center justify-center",
                        getPointsBadgeClass(editingPoints[rule.id] ?? rule.pontos)
                      )}
                    >
                      {formatPoints(editingPoints[rule.id] ?? rule.pontos)}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-900"
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
