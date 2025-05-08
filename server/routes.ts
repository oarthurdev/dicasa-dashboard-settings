import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { convertToSnakeCase } from "./utils.ts";
import {
  ruleFormSchema,
  kommoConfigFormSchema,
  loginFormSchema,
  Rule,
} from "@shared/schema.ts";
import { z } from "zod";
import { supabase, supabaseClient as supabaseServer } from "./supabase.ts";

// Middleware de autenticação usando Supabase
const authenticateSupabaseJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token de autenticação ausente ou inválido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data.user) {
      return res
        .status(401)
        .json({ message: "Token de autenticação inválido" });
    }

    // Adiciona os dados do usuário ao objeto da requisição para uso posterior
    (req as any).user = data.user;
    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(401).json({ message: "Erro na autenticação" });
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
        password,
      });

      if (error || !data.user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Retorna o token de acesso e os dados do usuário
      return res.status(200).json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rules routes
  app.get(
    "/api/rules",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 7;
        const offset = (page - 1) * limit;

        // Obter o company_id do usuário autenticado
        const { data: userData } = await supabaseServer
          .from('users')
          .select('company_id')
          .eq('id', (req as any).user.id)
          .single();

        // Buscar regras padrão e regras personalizadas da empresa
        const rules = await supabase.getRulesPaginated(offset, limit, userData?.company_id);
        const totalRules = await supabase.getTotalRules(userData?.company_id);
        const totalPages = Math.ceil(totalRules / limit);

        return res.status(200).json({
          rules,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: totalRules,
          },
        });
      } catch (error) {
        console.error("Error fetching rules:", error);
        return res.status(500).json({ message: "Erro ao buscar regras" });
      }
    },
  );

  app.post(
    "/api/rules",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const validation = ruleFormSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            message: "Dados da regra inválidos",
            errors: validation.error.format(),
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
          coluna_nome: columnName,
        });

        return res.status(201).json([newRule] as Rule[]);
      } catch (error) {
        console.error("Error creating rule:", error);
        return res.status(500).json({ message: "Erro ao criar regra" });
      }
    },
  );

  app.delete(
    "/api/rules/:id",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
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
    },
  );

  app.patch(
    "/api/rules/:id/points",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const { points } = req.body;

        if (isNaN(ruleId)) {
          return res.status(400).json({ message: "ID de regra inválido" });
        }

        if (typeof points !== "number" || points < -100 || points > 100) {
          return res.status(400).json({ message: "Valor de pontos inválido" });
        }

        const updatedRule = await supabase.updateRule(ruleId, {
          pontos: points,
        });
        if (!updatedRule) {
          return res.status(404).json({ message: "Regra não encontrada" });
        }

        return res.status(200).json(updatedRule);
      } catch (error) {
        console.error("Error updating rule points:", error);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar pontos da regra" });
      }
    },
  );

  // Kommo config routes
  app.get(
    "/api/kommo-config",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const config = await supabase.getKommoConfig();
        return res.status(200).json(config || {});
      } catch (error) {
        console.error("Error fetching Kommo config:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar configurações Kommo" });
      }
    },
  );

  app.post(
    "/api/kommo-config/test",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const { api_url, access_token } = req.body;

        if (!api_url || !access_token) {
          return res.status(400).json({
            success: false,
            message: "URL da API e token de acesso são obrigatórios",
          });
        }

        // Testa a conexão fazendo uma requisição para a API da Kommo
        const response = await fetch(`${api_url}/account`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        if (!response.ok) {
          return res.status(400).json({
            success: false,
            message:
              "Não foi possível conectar com a API Kommo. Verifique suas credenciais.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Conexão com a API Kommo estabelecida com sucesso",
        });
      } catch (error) {
        console.error("Erro ao testar conexão com Kommo:", error);
        return res.status(500).json({
          success: false,
          message: "Erro ao testar conexão com a API Kommo",
        });
      }
    },
  );

  app.post(
    "/api/kommo-config",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const parsedBody = {
          ...req.body,
          sync_start_date: req.body.sync_start_date
            ? Math.floor(Date.parse(req.body.sync_start_date) / 1000)
            : null,
          sync_end_date: req.body.sync_end_date
            ? Math.floor(Date.parse(req.body.sync_end_date) / 1000)
            : null,
        };

        const validation = kommoConfigFormSchema.safeParse(parsedBody);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados de configuração inválidos",
            errors: validation.error.format(),
          });
        }

        const {
          api_url,
          access_token,
          sync_interval,
          sync_start_date,
          sync_end_date,
          active,
        } = validation.data;

        // Get current config
        const existingConfig = await supabase.getKommoConfig();

        let config;
        if (existingConfig) {
          // Update existing config
          config = await supabase.updateKommoConfig({
            ...existingConfig,
            api_url,
            access_token,
            sync_interval,
            sync_start_date,
            sync_end_date,
            active,
          });
        } else {
          // Create new config
          config = await supabase.createKommoConfig({
            api_url,
            access_token,
            sync_interval,
            sync_start_date,
            sync_end_date,
            active,
          });
        }

        return res.status(200).json(config);
      } catch (error) {
        console.error("Error updating Kommo config:", error);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar configurações Kommo" });
      }
    },
  );

  // Sync management routes
  app.post(
    "/api/sync/force",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const streamlitUrl = process.env.STREAMLIT_URL || "http://0.0.0.0:8501";

        // Registra o evento de sincronização
        await supabase.createSyncLog({
          type: "SYNC",
          message: "Sincronização manual iniciada",
        });

        // Envia comando para o Streamlit
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);

        try {
          const { stdout, stderr } = await execAsync(
            `curl -s -X POST ${streamlitUrl}/sync -H "Content-Type: application/json" -d '{"force": true}'`,
          );

          // Verifica se a resposta é válida
          try {
            const response = JSON.parse(stdout);
            if (response.status != "success") {
              throw new Error(response.message || "Erro na sincronização");
            }
          } catch (parseError) {
            console.error("Erro ao processar resposta:", stdout);
            throw new Error("Erro ao processar resposta da sincronização");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Erro desconhecido na sincronização";
          throw new Error(errorMessage);
        }

        return res
          .status(200)
          .json({ message: "Sincronização forçada com sucesso" });
      } catch (error) {
        console.error("Error forcing sync:", error);

        // Registra o erro
        await supabase.createSyncLog({
          type: "ERROR",
          message: `Erro ao forçar sincronização: ${error.message}`,
          created_at: new Date().toISOString(),
        });

        return res
          .status(500)
          .json({ message: "Erro ao forçar sincronização" });
      }
    },
  );

  // Data management routes
  app.post(
    "/api/data/delete-all",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        await supabase.deleteAllData();
        return res
          .status(200)
          .json({ message: "Todos os dados foram excluídos com sucesso" });
      } catch (error) {
        console.error("Error deleting data:", error);
        return res.status(500).json({ message: "Erro ao excluir dados" });
      }
    },
  );

  // Monitoring routes
  app.get(
    "/api/sync-logs",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const logs = await supabase.getSyncLogs(limit);
        return res.status(200).json(logs);
      } catch (error) {
        console.error("Error fetching sync logs:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar logs de sincronização" });
      }
    },
  );

  app.get(
    "/api/sync-status",
    authenticateSupabaseJWT,
    async (req: Request, res: Response) => {
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
        return res
          .status(500)
          .json({ message: "Erro ao buscar status de sincronização" });
      }
    },
  );

  // Broker routes
  app.get("/api/brokers", authenticateSupabaseJWT, async (req, res) => {
    try {
      const { data: brokers, error } = await supabaseServer
        .from('brokers')
        .select('*')
        .eq('cargo', 'Corretor');

      if (error) throw error;
      res.json(brokers);
    } catch (error) {
      console.error("Error fetching brokers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/brokers/:id", authenticateSupabaseJWT, async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    try {
      const { error } = await supabaseServer
        .from('brokers')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating broker:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
