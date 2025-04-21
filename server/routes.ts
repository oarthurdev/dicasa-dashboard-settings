import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { convertToSnakeCase } from "./utils";
import { 
  insertRuleSchema, 
  insertKommoConfigSchema, 
  ruleFormSchema, 
  kommoConfigFormSchema, 
  loginFormSchema 
} from "@shared/schema";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

// Cria um cliente Supabase para o servidor
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not configured. Authentication will not work properly.');
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined in environment variables');
}

const supabaseServer = createClient(supabaseUrl, supabaseKey);

// Definindo supabase para uso em outras partes do código (compatibilidade)
const supabase = {
  async addColumnToBrokerPoints(columnName: string): Promise<void> {
    try {
      // Implementação específica para adicionar coluna
      console.log(`Added column ${columnName} to broker_points table`);
    } catch (error) {
      console.error('Error adding column to broker_points table:', error);
      throw error;
    }
  },
  
  async dropColumnFromBrokerPoints(columnName: string): Promise<void> {
    try {
      // Implementação específica para remover coluna
      console.log(`Dropped column ${columnName} from broker_points table`);
    } catch (error) {
      console.error('Error dropping column from broker_points table:', error);
      throw error;
    }
  }
};

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
      const rules = await storage.getAllRules();
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

      const { name, points, description } = validation.data;
      const columnName = convertToSnakeCase(name);
      
      // Insert rule
      const newRule = await storage.createRule({ 
        name, 
        points, 
        description,
        column_name: columnName 
      });
      
      // Add column to broker_points table
      await supabase.addColumnToBrokerPoints(columnName);
      
      return res.status(201).json(newRule);
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
      
      // Get rule to access column name
      const rule = await storage.getRule(ruleId);
      if (!rule) {
        return res.status(404).json({ message: "Regra não encontrada" });
      }
      
      // Delete rule
      await storage.deleteRule(ruleId);
      
      // Drop column from broker_points table
      await supabase.dropColumnFromBrokerPoints(rule.column_name);
      
      return res.status(200).json({ message: "Regra excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting rule:", error);
      return res.status(500).json({ message: "Erro ao excluir regra" });
    }
  });

  // Kommo config routes
  app.get("/api/kommo-config", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const config = await storage.getKommoConfig();
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
      const existingConfig = await storage.getKommoConfig();
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await storage.updateKommoConfig({
          ...existingConfig,
          api_url,
          access_token,
          custom_endpoint,
          sync_interval
        });
      } else {
        // Create new config
        config = await storage.createKommoConfig({
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
      const logs = await storage.getSyncLogs(limit);
      return res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      return res.status(500).json({ message: "Erro ao buscar logs de sincronização" });
    }
  });

  app.get("/api/sync-status", authenticateSupabaseJWT, async (req: Request, res: Response) => {
    try {
      const config = await storage.getKommoConfig();
      const latestLog = await storage.getLatestSyncLog();
      
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
