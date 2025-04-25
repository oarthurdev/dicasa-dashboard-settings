import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { convertToSnakeCase } from "./utils";
import { 
  ruleFormSchema,
  kommoConfigFormSchema, 
  loginFormSchema, 
  Rule
} from "@shared/schema";
import { z } from "zod";
import { supabase, supabaseClient as supabaseServer } from './supabase';

// Middleware de autenticação usando Supabase
const authenticateSupabaseJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação ausente ou inválido' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: 'Token de autenticação inválido' });
    }

    // Adiciona os dados do usuário ao objeto da requisição para uso posterior
    (req as any).user = data.user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ message: 'Erro na autenticação' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validation = loginFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados de login inválidos" });
      }

      const { email, password } = validation.data;
      
      // Usar o Supabase para autenticação
      const { data, error } = await supabaseServer.auth.signInWithPassword({
        email,
        password
      });
      
      if (error || !data.user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      // Retorna o token de acesso e os dados do usuário
      return res.status(200).json({ 
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rules routes
  app.get("/api/rules", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const rules = await supabase.getAllRules();
      return res.status(200).json(rules);
    } catch (error) {
      console.error("Error fetching rules:", error);
      return res.status(500).json({ message: "Erro ao buscar regras" });
    }
  });

  app.post("/api/rules", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const validation = ruleFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dados da regra inválidos", 
          errors: validation.error.format() 
        });
      }

      const { nome, pontos, descricao } = validation.data;
      const columnName = convertToSnakeCase(nome);

      // Criar a regra usando o Supabase
      // O método createRule já adiciona automaticamente a coluna ao broker_points
      const newRule = await supabase.createRule({ 
        nome, 
        pontos, 
        descricao,
        coluna_nome: columnName 
      });
      
      return res.status(201).json([newRule] as Rule[]);
    } catch (error) {
      console.error("Error creating rule:", error);
      return res.status(500).json({ message: "Erro ao criar regra" });
    }
  });

  app.delete("/api/rules/:id", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ message: "ID de regra inválido" });
      }
      
      // Deletar a regra usando o Supabase
      // O método deleteRule já remove automaticamente a coluna do broker_points
      await supabase.deleteRule(ruleId);
      
      return res.status(200).json({ message: "Regra excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting rule:", error);
      return res.status(500).json({ message: "Erro ao excluir regra" });
    }
  });

  app.patch("/api/rules/:id/points", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      const { points } = req.body;

      if (isNaN(ruleId)) {
        return res.status(400).json({ message: "ID de regra inválido" });
      }

      if (typeof points !== 'number' || points < -100 || points > 100) {
        return res.status(400).json({ message: "Valor de pontos inválido" });
      }

      const updatedRule = await supabase.updateRule(ruleId, { pontos: points });
      if (!updatedRule) {
        return res.status(404).json({ message: "Regra não encontrada" });
      }

      return res.status(200).json(updatedRule);
    } catch (error) {
      console.error("Error updating rule points:", error);
      return res.status(500).json({ message: "Erro ao atualizar pontos da regra" });
    }
  });

  // Kommo config routes
  app.get("/api/kommo-config", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const config = await supabase.getKommoConfig();
      return res.status(200).json(config || {});
    } catch (error) {
      console.error("Error fetching Kommo config:", error);
      return res.status(500).json({ message: "Erro ao buscar configurações Kommo" });
    }
  });

  app.post("/api/kommo-config", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const validation = kommoConfigFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dados de configuração inválidos", 
          errors: validation.error.format() 
        });
      }

      const { api_url, access_token, custom_endpoint, sync_interval } = validation.data;
      
      // Get current config
      const existingConfig = await supabase.getKommoConfig();
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await supabase.updateKommoConfig({
          ...existingConfig,
          api_url,
          access_token,
          custom_endpoint,
          sync_interval
        });
      } else {
        // Create new config
        config = await supabase.createKommoConfig({
          api_url,
          access_token,
          custom_endpoint,
          sync_interval
        });
      }
      
      return res.status(200).json(config);
    } catch (error) {
      console.error("Error updating Kommo config:", error);
      return res.status(500).json({ message: "Erro ao atualizar configurações Kommo" });
    }
  });

  // Monitoring routes
  app.get("/api/sync-logs", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await supabase.getSyncLogs(limit);
      return res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      return res.status(500).json({ message: "Erro ao buscar logs de sincronização" });
    }
  });

  app.get("/api/sync-status", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const config = await supabase.getKommoConfig();
      const latestLog = await supabase.getLatestSyncLog();
      
      return res.status(200).json({
        lastSync: config?.last_sync || null,
        nextSync: config?.next_sync || null,
        latestLog,
        status: latestLog?.type === "ERROR" ? "error" : "connected",
      });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      return res.status(500).json({ message: "Erro ao buscar status de sincronização" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
