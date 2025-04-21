import { Rule } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

type RulesTableProps = {
  rules: Rule[];
  onDelete: (rule: Rule) => void;
};

export default function RulesTable({ rules, onDelete }: RulesTableProps) {
  // Get badge color based on points value
  const getPointsBadgeClass = (points: number) => {
    if (points < 0) return "bg-red-100 text-red-800";
    if (points > 0) return "bg-green-100 text-green-800";
    return "bg-gray-200 text-gray-800";
  };
  
  // Format points with +/- sign
  const formatPoints = (points: number) => {
    return points > 0 ? `+${points}` : points;
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome da Regra
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Coluna Gerada
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
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                Nenhuma regra encontrada. Crie uma nova regra para começar.
              </td>
            </tr>
          ) : (
            rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {rule.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rule.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {rule.column_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    variant="outline" 
                    className={cn(getPointsBadgeClass(rule.points))}
                  >
                    {formatPoints(rule.points)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-900 mr-2"
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600 hover:text-blue-900"
                    onClick={() => {}}
                  >
                    <Edit size={18} />
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
