import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateJWT, authenticateUser, generateToken } from "./auth";
import { supabase } from "./supabase";
import { convertToSnakeCase } from "./utils";
import { 
  insertRuleSchema, 
  insertKommoConfigSchema, 
  ruleFormSchema, 
  kommoConfigFormSchema, 
  loginFormSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validation = loginFormSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados de login inválidos" });
      }

      const { email, password } = validation.data;
      const user = await authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      const token = generateToken(user);
      return res.status(200).json({ token, user });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rules routes
  app.get("/api/rules", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const rules = await storage.getAllRules();
      return res.status(200).json(rules);
    } catch (error) {
      console.error("Error fetching rules:", error);
      return res.status(500).json({ message: "Erro ao buscar regras" });
    }
  });

  app.post("/api/rules", authenticateJWT, async (req: Request, res: Response) => {
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

  app.delete("/api/rules/:id", authenticateJWT, async (req: Request, res: Response) => {
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
  app.get("/api/kommo-config", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const config = await storage.getKommoConfig();
      return res.status(200).json(config || {});
    } catch (error) {
      console.error("Error fetching Kommo config:", error);
      return res.status(500).json({ message: "Erro ao buscar configurações Kommo" });
    }
  });

  app.post("/api/kommo-config", authenticateJWT, async (req: Request, res: Response) => {
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
  app.get("/api/sync-logs", authenticateJWT, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getSyncLogs(limit);
      return res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      return res.status(500).json({ message: "Erro ao buscar logs de sincronização" });
    }
  });

  app.get("/api/sync-status", authenticateJWT, async (req: Request, res: Response) => {
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
