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
import { companyContext } from "./middlewares/companyContext.ts";
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
  app.post(
    "/api/auth/login",
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const validation = loginFormSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ message: "Dados de login inválidos" });
        }

        const { email, password } = validation.data;

        const companyId = (req as any).companyId;

        // Usar o Supabase para autenticação
        const { data, error } = await supabaseServer.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Verificar se o usuário pertence à empresa correta
        const { data: userCompany, error: userCompanyError } =
          await supabaseServer
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

        if (userCompanyError || !userCompany) {
          return res
            .status(403)
            .json({ message: "Usuário não associado a um perfil" });
        }

        if (userCompany.company_id !== companyId) {
          return res
            .status(403)
            .json({ message: "Usuário não pertence a esta empresa" });
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
    },
  );

  // Rules routes
  app.get(
    "/api/rules",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 7;
        const offset = (page - 1) * limit;

        // Obter o company_id do usuário autenticado
        const companyId = (req as any).companyId;
        if (!companyId) {
          return res.status(400).json({ message: "Company ID not provided" });
        }

        // Buscar regras padrão e regras personalizadas da empresa
        const rules = await supabase.getRulesPaginated(
          offset,
          limit,
          companyId as string,
        );
        const totalRules = await supabase.getTotalRules(companyId as string);
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

  app.delete(
    "/api/rules/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        if (isNaN(ruleId)) {
          return res.status(400).json({ message: "ID de regra inválido" });
        }

        // Verificar se a regra pertence à empresa do usuário
        const companyId = (req as any).companyId;

        // Verificar se a regra existe e pertence à empresa
        const { data: rule } = await supabaseServer
          .from("rules")
          .select("*")
          .eq("id", ruleId)
          .single();

        if (!rule) {
          return res.status(404).json({ message: "Regra não encontrada" });
        }

        // Impedir deleção de regras padrão do sistema
        if (rule.company_id === null) {
          return res.status(403).json({
            message: "Não é possível deletar regras padrão do sistema",
          });
        }

        // Verificar se a regra pertence à empresa
        if (rule.company_id !== companyId) {
          return res.status(403).json({
            message: "Você não tem permissão para deletar esta regra",
          });
        }

        // Deletar a regra
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
    companyContext,
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

        // Verificar se a regra pertence à empresa do usuário
        const companyId = (req as any).companyId;

        // Verificar se a regra existe e pertence à empresa
        const { data: rule } = await supabaseServer
          .from("rules")
          .select("*")
          .eq("id", ruleId)
          .single();

        if (!rule) {
          return res.status(404).json({ message: "Regra não encontrada" });
        }

        // Impedir modificação de regras padrão do sistema
        if (rule.company_id === null) {
          return res.status(403).json({
            message: "Não é possível modificar regras padrão do sistema",
          });
        }

        // Verificar se a regra pertence à empresa
        if (rule.company_id !== companyId) {
          return res.status(403).json({
            message: "Você não tem permissão para modificar esta regra",
          });
        }

        const updatedRule = await supabase.updateRule(ruleId, {
          pontos: points,
        });

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
    companyContext,
    async (req: Request, res: Response) => {
      try {
        // Obter o company_id do usuário autenticado
        const companyId = (req as any).companyId;

        const { data: config, error } = await supabaseServer
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

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
    companyContext,
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
    companyContext,
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
          pipeline_id,
          active,
        } = validation.data;

        // Obter company_id do usuário autenticado
        const companyId = (req as any).companyId;

        const company_id = companyId as string;

        // Verificar se já existe config para a empresa
        const { data: existingConfig, error: fetchError } = await supabaseServer
          .from("kommo_config")
          .select("*")
          .eq("company_id", company_id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // Erro que não é "row not found"
          throw fetchError;
        }

        if (!existingConfig) {
          // Inserir novo registro
          const { data: inserted, error: insertError } = await supabaseServer
            .from("kommo_config")
            .insert([
              {
                api_url,
                access_token,
                sync_interval,
                sync_start_date,
                sync_end_date,
                pipeline_id,
                active,
                company_id,
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;

          // Notifica Streamlit
          await notifyStreamlit(company_id);

          return res.status(201).json(inserted);
        } else {
          // Verifica se há mudanças
          const changes: any = {};
          if (existingConfig.api_url !== api_url) changes.api_url = api_url;
          if (existingConfig.access_token !== access_token)
            changes.access_token = access_token;
          if (existingConfig.sync_interval !== sync_interval)
            changes.sync_interval = sync_interval;
          if (existingConfig.sync_start_date !== sync_start_date)
            changes.sync_start_date = sync_start_date;
          if (existingConfig.sync_end_date !== sync_end_date)
            changes.sync_end_date = sync_end_date;
          if (existingConfig.pipeline_id !== pipeline_id)
            changes.pipeline_id = pipeline_id;
          if (existingConfig.active !== active) changes.active = active;

          if (Object.keys(changes).length === 0) {
            return res.status(200).json({
              message: "Configuração já atualizada",
              data: existingConfig,
            });
          }

          const { data: updated, error: updateError } = await supabaseServer
            .from("kommo_config")
            .update(changes)
            .eq("company_id", company_id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Notifica Streamlit
          await notifyStreamlit(company_id);

          return res.status(200).json(updated);
        }
      } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        return res
          .status(500)
          .json({ message: "Erro ao salvar configurações Kommo" });
      }
    },
  );

  // 🔔 Função utilitária de notificação
  async function notifyStreamlit(company_id: string) {
    const streamlitUrl = process.env.STREAMLIT_URL || "http://0.0.0.0:8501";
    try {
      await fetch(`${streamlitUrl}/start_sync/${company_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Erro ao notificar Streamlit:", err);
    }
  }

  // Sync management routes
  app.post(
    "/api/sync/force",
    authenticateSupabaseJWT,
    companyContext,
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
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        await supabase.deleteAllData(companyId as string);
        return res
          .status(200)
          .json({ message: "Todos os dados foram excluídos com sucesso" });
      } catch (error) {
        console.error("Error deleting data:", error);
        return res.status(500).json({ message: "Erro ao excluir dados" });
      }
    },
  );

  // Kommo pipelines routes
  app.get(
    "/api/kommo/pipelines",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: kommoConfig } = await supabaseServer
          .from("kommo_config")
          .select("api_url,access_token")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!kommoConfig?.api_url || !kommoConfig?.access_token) {
          return res
            .status(400)
            .json({ message: "Configuração Kommo não encontrada" });
        }

        const response = await fetch(`${kommoConfig.api_url}/leads/pipelines`, {
          headers: {
            Authorization: `Bearer ${kommoConfig.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pipelines");
        }

        const data = await response.json();
        return res.json(data._embedded?.pipelines || []);
      } catch (error) {
        console.error("Error fetching pipelines:", error);
        return res.status(500).json({ message: "Erro ao buscar funis" });
      }
    },
  );

  // Monitoring routes
  app.get(
    "/api/sync-logs",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const limit = parseInt(req.query.limit as string) || 10;
        const { data: logs } = await supabaseServer
          .from("sync_logs")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(limit);

        return res.status(200).json(logs || []);
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
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: config } = await supabaseServer
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: latestLog } = await supabaseServer
          .from("sync_logs")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(1);

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
  app.get(
    "/api/brokers",
    authenticateSupabaseJWT,
    companyContext,
    async (req, res) => {
      try {
        const companyId = (req as any).companyId;

        const { data: brokers, error } = await supabaseServer
          .from("brokers")
          .select("*")
          .eq("company_id", companyId as string) // Added company_id filter
          .eq("cargo", "Corretor");

        if (error) throw error;
        res.json(brokers);
      } catch (error) {
        console.error("Error fetching brokers:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/brokers/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req, res) => {
      const { id } = req.params;
      const { active } = req.body;

      try {
        const companyId = (req as any).companyId;

        const { error } = await supabaseServer
          .from("brokers")
          .update({ active })
          .eq("id", id)
          .eq("company_id", companyId as string); // Added company_id filter

        if (error) throw error;
        res.json({ success: true });
      } catch (error) {
        console.error("Error updating broker:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
