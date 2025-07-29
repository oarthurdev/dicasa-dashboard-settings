import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { convertToSnakeCase } from "./utils.ts";
import {
  ruleFormSchema,
  kommoConfigFormSchema,
  loginFormSchema,
  companyRuleFormSchema,
  customRuleFormSchema,
  dynamicMetricFormSchema,
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
        const rules = await supabase.getRulesPaginated(offset, limit);
        const totalRules = await supabase.getTotalRules();
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

  // Company Rules Configuration Routes
  app.get(
    "/api/company-rules",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get all general rules with company-specific configurations
        const { data: generalRules } = await supabaseServer
          .from("rules")
          .select("*")
          .order("created_at", { ascending: true });

        // Get company-specific rule configurations
        const { data: companyConfigs } = await supabaseServer
          .from("company_rules")
          .select("*")
          .eq("company_id", companyId)
          .eq("active", true);

        // Get custom rules for this company
        const { data: customRules } = await supabaseServer
          .from("custom_rules")
          .select("*")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("created_at", { ascending: true });

        // Merge general rules with company configurations
        const rulesWithConfigs =
          generalRules?.map((rule) => {
            const companyConfig = companyConfigs?.find(
              (config) => config.rule_id === rule.id,
            );
            return {
              ...rule,
              company_pontos: companyConfig?.pontos || rule.pontos,
              has_custom_config: !!companyConfig,
              is_custom: false,
            };
          }) || [];

        // Add custom rules
        const customRulesFormatted =
          customRules?.map((rule) => ({
            ...rule,
            company_pontos: rule.pontos,
            has_custom_config: true,
            is_custom: true,
          })) || [];

        const allRules = [...rulesWithConfigs, ...customRulesFormatted];

        return res.status(200).json(allRules);
      } catch (error) {
        console.error("Error fetching company rules:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar configurações de regras" });
      }
    },
  );

  app.post(
    "/api/company-rules",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = companyRuleFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados inválidos",
            errors: validation.error.errors,
          });
        }

        const { rule_id, pontos, active } = validation.data;

        // Check if configuration already exists
        const { data: existing } = await supabaseServer
          .from("company_rules")
          .select("*")
          .eq("company_id", companyId)
          .eq("rule_id", rule_id)
          .single();

        if (existing) {
          // Update existing configuration
          const { data: updated, error } = await supabaseServer
            .from("company_rules")
            .update({ pontos, active, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select()
            .single();

          if (error) throw error;
          return res.status(200).json(updated);
        } else {
          // Create new configuration
          const { data: created, error } = await supabaseServer
            .from("company_rules")
            .insert({ company_id: companyId, rule_id, pontos, active })
            .select()
            .single();

          if (error) throw error;
          return res.status(201).json(created);
        }
      } catch (error) {
        console.error("Error creating/updating company rule config:", error);
        return res
          .status(500)
          .json({ message: "Erro ao configurar regra da empresa" });
      }
    },
  );

  app.post(
    "/api/custom-rules",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = customRuleFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados inválidos",
            errors: validation.error.errors,
          });
        }

        const { nome, pontos, descricao, active } = validation.data;
        const coluna_nome = convertToSnakeCase(nome);

        // Create custom rule
        const { data: created, error } = await supabaseServer
          .from("custom_rules")
          .insert({
            company_id: companyId,
            nome,
            coluna_nome,
            pontos,
            descricao,
            active,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(created);
      } catch (error) {
        console.error("Error creating custom rule:", error);
        return res
          .status(500)
          .json({ message: "Erro ao criar regra personalizada" });
      }
    },
  );

  app.patch(
    "/api/custom-rules/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const companyId = (req as any).companyId;
        const { pontos, active } = req.body;

        if (isNaN(ruleId)) {
          return res.status(400).json({ message: "ID de regra inválido" });
        }

        // Verify rule belongs to company
        const { data: rule } = await supabaseServer
          .from("custom_rules")
          .select("*")
          .eq("id", ruleId)
          .eq("company_id", companyId)
          .single();

        if (!rule) {
          return res
            .status(404)
            .json({ message: "Regra personalizada não encontrada" });
        }

        // Update custom rule
        const updateData: any = { updated_at: new Date().toISOString() };
        if (pontos !== undefined) updateData.pontos = pontos;
        if (active !== undefined) updateData.active = active;

        const { data: updated, error } = await supabaseServer
          .from("custom_rules")
          .update(updateData)
          .eq("id", ruleId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json(updated);
      } catch (error) {
        console.error("Error updating custom rule:", error);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar regra personalizada" });
      }
    },
  );

  app.delete(
    "/api/custom-rules/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const companyId = (req as any).companyId;

        if (isNaN(ruleId)) {
          return res.status(400).json({ message: "ID de regra inválido" });
        }

        // Verify rule belongs to company
        const { data: rule } = await supabaseServer
          .from("custom_rules")
          .select("*")
          .eq("id", ruleId)
          .eq("company_id", companyId)
          .single();

        if (!rule) {
          return res
            .status(404)
            .json({ message: "Regra personalizada não encontrada" });
        }

        // Delete custom rule
        const { error } = await supabaseServer
          .from("custom_rules")
          .delete()
          .eq("id", ruleId);

        if (error) throw error;
        return res
          .status(200)
          .json({ message: "Regra personalizada excluída com sucesso" });
      } catch (error) {
        console.error("Error deleting custom rule:", error);
        return res
          .status(500)
          .json({ message: "Erro ao excluir regra personalizada" });
      }
    },
  );

  // Dynamic Metrics Routes
  app.get(
    "/api/dynamic-metrics",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: metrics, error } = await supabaseServer
          .from("dynamic_metrics")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json(metrics || []);
      } catch (error) {
        console.error("Error fetching dynamic metrics:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar métricas dinâmicas" });
      }
    },
  );

  app.post(
    "/api/dynamic-metrics",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = dynamicMetricFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados inválidos",
            errors: validation.error.errors,
          });
        }

        const metricData = {
          ...validation.data,
          company_id: companyId,
        };

        const { data: created, error } = await supabaseServer
          .from("dynamic_metrics")
          .insert(metricData)
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json(created);
      } catch (error) {
        console.error("Error creating dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao criar métrica dinâmica" });
      }
    },
  );

  app.patch(
    "/api/dynamic-metrics/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const metricId = parseInt(req.params.id);
        const companyId = (req as any).companyId;

        if (isNaN(metricId)) {
          return res.status(400).json({ message: "ID de métrica inválido" });
        }

        // Verify metric belongs to company
        const { data: metric } = await supabaseServer
          .from("dynamic_metrics")
          .select("*")
          .eq("id", metricId)
          .eq("company_id", companyId)
          .single();

        if (!metric) {
          return res
            .status(404)
            .json({ message: "Métrica dinâmica não encontrada" });
        }

        const updateData = {
          ...req.body,
          updated_at: new Date().toISOString(),
        };

        const { data: updated, error } = await supabaseServer
          .from("dynamic_metrics")
          .update(updateData)
          .eq("id", metricId)
          .select()
          .single();

        if (error) throw error;

        return res.status(200).json(updated);
      } catch (error) {
        console.error("Error updating dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar métrica dinâmica" });
      }
    },
  );

  app.delete(
    "/api/dynamic-metrics/:id",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const metricId = parseInt(req.params.id);
        const companyId = (req as any).companyId;

        if (isNaN(metricId)) {
          return res.status(400).json({ message: "ID de métrica inválido" });
        }

        // Verify metric belongs to company
        const { data: metric } = await supabaseServer
          .from("dynamic_metrics")
          .select("*")
          .eq("id", metricId)
          .eq("company_id", companyId)
          .single();

        if (!metric) {
          return res
            .status(404)
            .json({ message: "Métrica dinâmica não encontrada" });
        }

        const { error } = await supabaseServer
          .from("dynamic_metrics")
          .delete()
          .eq("id", metricId);

        if (error) throw error;

        return res
          .status(200)
          .json({ message: "Métrica dinâmica excluída com sucesso" });
      } catch (error) {
        console.error("Error deleting dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao excluir métrica dinâmica" });
      }
    },
  );

  // Pipeline Stages Route
  app.get(
    "/api/kommo/pipeline-stages",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get company's Kommo config
        const { data: config } = await supabaseServer
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (!config || !config.api_url || !config.access_token) {
          return res.status(200).json([]);
        }

        // Parse pipeline_id - it's stored as text (JSON string) in database
        let pipelineIds = [];
        try {
          if (config.pipeline_id) {
            if (typeof config.pipeline_id === "string") {
              pipelineIds = JSON.parse(config.pipeline_id);
            } else if (Array.isArray(config.pipeline_id)) {
              pipelineIds = config.pipeline_id;
            }
          }
        } catch (error) {
          console.error("Error parsing pipeline_id:", error);
          return res.status(200).json([]);
        }

        if (!Array.isArray(pipelineIds) || pipelineIds.length === 0) {
          return res.status(200).json([]);
        }

        // Import KommoAuthManager
        const { KommoAuthManager } = await import("./kommoAuth.ts");

        // Fetch pipeline stages from Kommo API
        const allStages = [];

        for (const pipelineId of pipelineIds) {
          try {
            // Ensure URL format is correct (remove trailing slashes)
            const baseUrl = config.api_url.replace(/\/+$/, "");
            const statusesUrl = `${baseUrl}/leads/pipelines/${pipelineId}/statuses`;

            console.log(
              `Fetching stages for pipeline ${pipelineId} from: ${statusesUrl}`,
            );

            const response = await KommoAuthManager.makeAuthenticatedRequest(
              companyId,
              statusesUrl,
            );

            if (response.ok) {
              const data = await response.json();

              // Get pipeline name first
              const pipelineUrl = `${baseUrl}/leads/pipelines/${pipelineId}`;
              const pipelineResponse =
                await KommoAuthManager.makeAuthenticatedRequest(
                  companyId,
                  pipelineUrl,
                );

              let pipelineName = `Pipeline ${pipelineId}`;
              if (pipelineResponse.ok) {
                const pipelineData = await pipelineResponse.json();
                pipelineName = pipelineData.name;
              } else {
                console.error(
                  "Error fetching pipeline name:",
                  await pipelineResponse.text(),
                );
              }

              // Process stages from API response
              if (data._embedded && data._embedded.statuses) {
                for (const status of data._embedded.statuses) {
                  allStages.push({
                    id: status.id,
                    name: status.name,
                    pipeline_id: status.pipeline_id,
                    pipeline_name: pipelineName,
                  });
                }
              }
            } else {
              const errorText = await response.text();
              console.error(
                `Error fetching stages for pipeline ${pipelineId}:`,
                {
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url,
                  errorBody: errorText,
                },
              );
            }
          } catch (error) {
            console.error(
              `Error fetching stages for pipeline ${pipelineId}:`,
              error,
            );
          }
        }

        return res.status(200).json(allStages);
      } catch (error) {
        console.error("Error fetching pipeline stages:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar etapas do funil" });
      }
    },
  );

  // Kommo Pipelines Route
  app.get(
    "/api/kommo/pipelines",
    authenticateSupabaseJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get company's Kommo config
        const { data: config } = await supabaseServer
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (!config || !config.api_url || !config.access_token) {
          return res.status(200).json([]);
        }

        // Parse pipeline_id - it's stored as text (JSON string) in database
        let pipelineIds = [];
        try {
          if (config.pipeline_id) {
            if (typeof config.pipeline_id === "string") {
              pipelineIds = JSON.parse(config.pipeline_id);
            } else if (Array.isArray(config.pipeline_id)) {
              pipelineIds = config.pipeline_id;
            }
          }
        } catch (error) {
          console.error("Error parsing pipeline_id:", error);
          return res.status(200).json([]);
        }

        if (!Array.isArray(pipelineIds) || pipelineIds.length === 0) {
          return res.status(200).json([]);
        }

        // Import KommoAuthManager
        const { KommoAuthManager } = await import("./kommoAuth.ts");

        // Fetch pipeline details from Kommo API
        const pipelines = [];

        for (const pipelineId of pipelineIds) {
          try {
            // Ensure URL format is correct (remove trailing slashes)
            const baseUrl = config.api_url.replace(/\/+$/, "");
            const fullUrl = `${baseUrl}/leads/pipelines/${pipelineId}`;

            console.log(`Fetching pipeline ${pipelineId} from: ${fullUrl}`);

            const response = await KommoAuthManager.makeAuthenticatedRequest(
              companyId,
              fullUrl,
            );

            console.log(
              `Response status for pipeline ${pipelineId}:`,
              response.status,
            );

            if (response.ok) {
              const data = await response.json();
              console.log(`Pipeline ${pipelineId} data:`, data);
              pipelines.push({
                id: data.id.toString(),
                name: data.name,
              });
            } else {
              const errorText = await response.text();
              console.error(`Error fetching pipeline ${pipelineId}:`, {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                errorBody: errorText,
              });
            }
          } catch (error) {
            console.error(`Error fetching pipeline ${pipelineId}:`, error);
          }
        }

        return res.status(200).json(pipelines);
      } catch (error) {
        console.error("Error fetching pipelines:", error);
        return res.status(500).json({ message: "Erro ao buscar funis" });
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
            authorization: `Bearer ${access_token}`,
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
        const validation = kommoConfigFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados de configuração inválidos",
            errors: validation.error.format(),
          });
        }

        const { 
          api_url, 
          access_token, 
          refresh_token, 
          client_id, 
          client_secret, 
          custom_endpoint, 
          pipeline_id, 
          active 
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
                refresh_token,
                client_id,
                client_secret,
                custom_endpoint,
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
          if (existingConfig.refresh_token !== refresh_token)
            changes.refresh_token = refresh_token;
          if (existingConfig.client_id !== client_id)
            changes.client_id = client_id;
          if (existingConfig.client_secret !== client_secret)
            changes.client_secret = client_secret;
          if (existingConfig.custom_endpoint !== custom_endpoint)
            changes.custom_endpoint = custom_endpoint;
          if (
            JSON.stringify(existingConfig.pipeline_id) !==
            JSON.stringify(pipeline_id)
          )
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
      await fetch(`${streamlitUrl}/restart/${company_id}`, {
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
            `curl -s -X POST ${streamlitUrl}/start -H "Content-Type: application/json" -d '{"force": true}'`,
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
          message: `Erro ao forçar sincronização: ${(error as Error).message}`,
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
          status:
            latestLog && latestLog.length > 0 && latestLog[0].type === "ERROR"
              ? "error"
              : "connected",
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
