import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BookOpen, Settings, BarChart3 } from "lucide-react";

export default function Welcome() {
  const [_, navigate] = useLocation();
  
  return (
    <section className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Bem-vindo ao Sistema de Configuração de Dashboard</h1>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Sobre este Sistema</h2>
            <p className="text-gray-600">
              Este é um sistema de configuração para uma dashboard desenvolvida em Python com Streamlit. 
              A dashboard é responsável por conectar-se à API da Kommo, buscar dados e armazená-los no Supabase, 
              mantendo-os atualizados a cada 5 minutos.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Funcionalidades Principais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <BookOpen className="text-primary mr-2 h-5 w-5" />
                  <h3 className="font-medium text-gray-800">Gestão de Regras</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Crie e gerencie regras com pontuações que afetam dinamicamente a estrutura do banco de dados.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <Settings className="text-primary mr-2 h-5 w-5" />
                  <h3 className="font-medium text-gray-800">Configurações Kommo</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Configure os parâmetros de conexão com a API da Kommo, incluindo URL e tokens de acesso.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <BarChart3 className="text-primary mr-2 h-5 w-5" />
                  <h3 className="font-medium text-gray-800">Monitoramento</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Acompanhe o status da integração, veja logs e monitore a próxima atualização programada.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Começando</h2>
            <p className="text-gray-600 mb-4">
              Para iniciar, navegue até a seção "Regras" no menu lateral para criar sua primeira regra ou 
              configure a conexão com a Kommo na seção "Kommo Configurações".
            </p>
            <Button 
              onClick={() => navigate("/rules")}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Ir para Regras
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
