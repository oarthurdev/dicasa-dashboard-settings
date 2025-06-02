import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

export default function CompanySelect() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [_, navigate] = useLocation();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name");
    if (data) {
      setCompanies(data);
    }
  };

  const handleCompanySelect = (value: string) => {
    setSelectedCompany(value);
    localStorage.setItem("selected_company", value);
    navigate("/rules");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <Card className="w-[400px] shadow-xl border-0 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <CardHeader className="space-y-1 text-center">
          <Building2 className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl font-semibold tracking-tight">Selecionar Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select value={selectedCompany} onValueChange={handleCompanySelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}