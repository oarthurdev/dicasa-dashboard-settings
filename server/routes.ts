
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { convertToSnakeCase, } from "./utils.ts";
import {
  ruleFormSchema,
  kommoConfigFormSchema,
  loginFormSchema,
  companyRuleFormSchema,
  customRuleFormSchema,
  dynamicMetricFormSchema,
  notificationFormSchema,
  alertSettingsFormSchema,
  automaticReportFormSchema,
  authSystemFormSchema,
  Rule,
} from "@shared/schema.ts";
import { z } from "zod";
import { supabase, supabaseClient as supabaseServer } from "./supabase.ts";
import { companyContext } from "./middlewares/companyContext.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateFullReportPDF } from "./helper/generateFullReportPDF.ts";
import { sendReportEmail } from "./utils/mailer"; // ajuste o path
import { getRangeByFrequency } from "./utils/date.ts";
import { processAutomaticReports } from "./jobs/processAutomaticReports.ts";

const LEADS_DATE_COL = "criado_em"; // TROQUE se no seu schema for "created_at"
const LOST_STATUS_ID = 143;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function throwIfError(step: string, error: any) {
  if (!error) return;
  console.error(`[REPORT][${step}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
  throw new Error(`Falha no passo: ${step} | ${error?.message || "Sem mensagem"}`);
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // último ms do mês
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

function formatBR(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Middleware de autenticação usando tabela brokers
const authenticateBrokerJWT = async (
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Buscar o broker no banco de dados
    const { data: broker, error } = await supabaseServer
      .from("brokers")
      .select("*")
      .eq("email", decoded.email)
      .eq("cargo", "Administrador")
      .single();

    if (error || !broker) {
      return res
        .status(401)
        .json({ message: "Token de autenticação inválido" });
    }

    // Adiciona os dados do usuário ao objeto da requisição para uso posterior
    (req as any).user = broker;
    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(401).json({ message: "Erro na autenticação" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post(
    "/admin/api/auth/login",
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const validation = loginFormSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ message: "Dados de login inválidos" });
        }

        const { email, password } = validation.data;
        
        // Usar company_id da query se fornecido, senão usar do middleware
        const queryCompanyId = req.query.company_id as string;
        const companyId = queryCompanyId || (req as any).companyId;

        if (!companyId) {
          return res.status(400).json({ message: "Company ID é obrigatório" });
        }

        // Buscar o broker na tabela brokers
        const { data: broker, error } = await supabaseServer
          .from("brokers")
          .select("*")
          .eq("email", email)
          .eq("company_id", companyId)
          .single();

        if (error || !broker) {
          return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Verificar se o cargo é Administrador
        if (broker.cargo !== "Administrador") {
          return res.status(403).json({ 
            message: "Acesso negado. Apenas administradores podem fazer login." 
          });
        }

        // Verificar a senha
        const isValidPassword = await bcrypt.compare(password, broker.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Gerar token JWT
        const token = jwt.sign(
          { 
            email: broker.email,
            id: broker.id,
            company_id: broker.company_id 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Retorna o token de acesso e os dados do usuário
        return res.status(200).json({
          token,
          user: {
            id: broker.id,
            email: broker.email,
            nome: broker.nome,
            cargo: broker.cargo,
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
    "/admin/api/rules",
    authenticateBrokerJWT,
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
    "/admin/api/rules/:id",
    authenticateBrokerJWT,
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
    "/admin/api/rules/:id/points",
    authenticateBrokerJWT,
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
    "/admin/api/company-rules",
    authenticateBrokerJWT,
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
    "/admin/api/company-rules",
    authenticateBrokerJWT,
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
    "/admin/api/custom-rules",
    authenticateBrokerJWT,
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
    "/admin/api/custom-rules/:id",
    authenticateBrokerJWT,
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
    "/admin/api/custom-rules/:id",
    authenticateBrokerJWT,
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
    "/admin/api/dynamic-metrics",
    authenticateBrokerJWT,
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
    "/admin/api/dynamic-metrics",
    authenticateBrokerJWT,
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
    "/admin/api/dynamic-metrics/:id",
    authenticateBrokerJWT,
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
    "/admin/api/dynamic-metrics/:id",
    authenticateBrokerJWT,
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
    "/admin/api/kommo/pipeline-stages",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get company's Kommo config
        const { data: config } = await supabaseServer
          .schema("cf_kommo")
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
        //const { KommoAuthManager } = await import("./kommoAuth.ts");

        // Fetch pipeline stages from Kommo API
        const allStages = [];

        for (const pipelineId of pipelineIds) {
          try {
            // Ensure URL format is correct (remove trailing slashes)
            const baseUrl = config.api_url.replace(/\/+$/, "");
            const statusesUrl = `${baseUrl}/leads/pipelines/${pipelineId}/statuses`;

            const response = await fetch(statusesUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.access_token}`,
              }
            });
            
            console.log(
              `Fetching stages for pipeline ${pipelineId} from: ${statusesUrl}`,
            );

            /*
            const response = await KommoAuthManager.makeAuthenticatedRequest(
              companyId,
              statusesUrl,
            );
            */

            if (response.ok) {
              const data = await response.json();

              // Get pipeline name first
              const pipelineUrl = `${baseUrl}/leads/pipelines/${pipelineId}`;
              const pipelineResponse =
                await fetch(pipelineUrl, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.access_token}`,
                  },
                });

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
    "/admin/api/kommo/pipelines",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get company's Kommo config
        const { data: config } = await supabaseServer
          .schema("cf_kommo")
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (!config || !config.api_url || !config.access_token) {
          return res.status(200).json([]);
        }

        // Import KommoAuthManager
        //const { KommoAuthManager } = await import("./kommoAuth.ts");

        // Fetch ALL pipelines from Kommo API
        const baseUrl = config.api_url.replace(/\/+$/, "");
        const pipelinesUrl = `${baseUrl}/leads/pipelines`;

        /*
        const response = await KommoAuthManager.makeAuthenticatedRequest(
          companyId,
          pipelinesUrl,
        );
        */
        const response = await fetch(pipelinesUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching pipelines:", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorBody: errorText,
          });
          return res.status(200).json([]);
        }

        const data = await response.json();
        const pipelines = [];

        console.log("API Response structure:", JSON.stringify(data, null, 2));

        // Process pipelines from API response - handle different response formats
        let pipelineArray = [];

        if (data._embedded && data._embedded.pipelines) {
          // Format 1: Embedded pipelines
          pipelineArray = data._embedded.pipelines;
        } else if (Array.isArray(data)) {
          // Format 2: Direct array
          pipelineArray = data;
        } else if (data.pipelines && Array.isArray(data.pipelines)) {
          // Format 3: Pipelines property
          pipelineArray = data.pipelines;
        } else if (data.result && Array.isArray(data.result)) {
          // Format 4: Result property
          pipelineArray = data.result;
        } else {
          console.error("Unknown API response format:", data);
        }

        for (const pipeline of pipelineArray) {
          // Only include active pipelines (skip archived/deleted ones)
          if (pipeline.is_archive !== true && pipeline.is_deleted !== true) {
            pipelines.push({
              id: pipeline.id.toString(),
              name: pipeline.name,
              is_main: pipeline.is_main || false,
              is_archive: pipeline.is_archive || false,
            });
          }
        }

        console.log(`Found ${pipelines.length} active pipelines`);
        return res.status(200).json(pipelines);
      } catch (error) {
        console.error("Error fetching pipelines:", error);
        return res.status(500).json({ message: "Erro ao buscar funis" });
      }
    },
  );

  // Kommo config routes
  app.get(
    "/admin/api/kommo-config",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        // Obter o company_id do usuário autenticado
        const companyId = (req as any).companyId;

        const { data: config, error } = await supabaseServer
          .schema("cf_kommo")
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
    "/admin/api/kommo-config/test",
    authenticateBrokerJWT,
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
    "/admin/api/kommo-config",
    authenticateBrokerJWT,
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
          active,
        } = validation.data;

        // Obter company_id do usuário autenticado
        const companyId = (req as any).companyId;

        const company_id = companyId as string;

        // Verificar se já existe config para a empresa
        const { data: existingConfig, error: fetchError } = await supabaseServer
          .schema("cf_kommo")
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
    "/admin/api/sync/force",
    authenticateBrokerJWT,
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
    "/admin/api/data/delete-all",
    authenticateBrokerJWT,
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
    "/admin/api/sync-logs",
    authenticateBrokerJWT,
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
    "/admin/api/sync-status",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: config } = await supabaseServer
          .schema("cf_kommo")
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
    "/admin/api/brokers",
    authenticateBrokerJWT,
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
    "/admin/api/brokers/:id",
    authenticateBrokerJWT,
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

  // Company Branding Routes
  app.get(
    "/admin/api/company-branding",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: branding, error } = await supabaseServer
          .from("company_branding")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return res.status(200).json(branding || {});
      } catch (error) {
        console.error("Error fetching company branding:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar configurações de marca" });
      }
    },
  );

  app.post(
    "/admin/api/company-branding",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const brandingData = req.body;

        // Check if branding already exists
        const { data: existingBranding, error: fetchError } = await supabaseServer
          .from("company_branding")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (!existingBranding) {
          // Create new branding
          const { data: newBranding, error: insertError } = await supabaseServer
            .from("company_branding")
            .insert({
              company_id: companyId,
              ...brandingData,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return res.status(201).json(newBranding);
        } else {
          // Update existing branding
          const { data: updatedBranding, error: updateError } = await supabaseServer
            .from("company_branding")
            .update(brandingData)
            .eq("company_id", companyId as string)
            .select()
            .single();

          if (updateError) throw updateError;
          return res.status(200).json(updatedBranding);
        }
      } catch (error) {
        console.error("Error saving company branding:", error);
        return res
          .status(500)
          .json({ message: "Erro ao salvar configurações de marca" });
      }
    },
  );

  // Dashboard Stats Route
  app.get(
    "/admin/api/dashboard-stats",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get rules count
        const { data: rules } = await supabaseServer
          .from("rules")
          .select("id");

        const { data: companyRules } = await supabaseServer
          .from("company_rules")
          .select("id")
          .eq("company_id", companyId as string)
          .eq("active", true);

        // Get brokers count
        const { data: brokers } = await supabaseServer
          .from("brokers")
          .select("id")
          .eq("company_id", companyId as string);

        // Get Kommo connection status
        const { data: kommoConfig } = await supabaseServer
          .schema("cf_kommo")
          .from("kommo_config")
          .select("active")
          .eq("company_id", companyId as string)
          .single();

        // Get latest sync info
        const { data: latestSync } = await supabaseServer
          .from("sync_logs")
          .select("timestamp, type")
          .eq("company_id", companyId as string)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        // Get next sync time from config
        const { data: syncConfig } = await supabaseServer
          .schema("cf_kommo")
          .from("kommo_config")
          .select("next_sync")
          .eq("company_id", companyId as string)
          .single();

        return res.status(200).json({
          totalRules: (rules?.length || 0),
          activeRules: (companyRules?.length || 0),
          totalBrokers: (brokers?.length || 0),
          lastSyncStatus: latestSync?.type || "Sem sincronizações",
          nextSyncTime: syncConfig?.next_sync,
          kommoConnected: kommoConfig?.active || false,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar estatísticas do dashboard" });
      }
    },
  );

  // Enhanced sync logs route
  app.get(
    "/admin/api/sync-logs-detailed",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const limit = parseInt(req.query.limit as string) || 50;

        const { data: logs } = await supabaseServer
          .from("sync_logs")
          .select("*")
          .eq("company_id", companyId as string)
          .order("timestamp", { ascending: false })
          .limit(limit);

        // Enhance logs with additional details
        const enhancedLogs = (logs || []).map(log => ({
          ...log,
          operation_type: log.message.includes('Kommo') ? 'Sincronização Kommo' : 
                         log.message.includes('Banco') ? 'Banco de Dados' : 
                         log.message.includes('Regra') ? 'Processamento de Regras' : 'Sistema',
          execution_time: Math.floor(Math.random() * 1000) + 100, // Mock execution time
          affected_records: log.type === 'SUCCESS' ? Math.floor(Math.random() * 50) + 1 : undefined,
          error_details: log.type === 'ERROR' ? log.message : undefined,
        }));

        return res.status(200).json(enhancedLogs);
      } catch (error) {
        console.error("Error fetching detailed sync logs:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar logs detalhados de sincronização" });
      }
    },
  );

  // Enhanced sync status route
  app.get(
    "/admin/api/sync-status",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: config } = await supabaseServer
          .schema("cf_kommo")
          .from("kommo_config")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        const { data: latestLog } = await supabaseServer
          .from("sync_logs")
          .select("*")
          .eq("company_id", companyId as string)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        // Get rules count
        const { data: rules } = await supabaseServer
          .from("company_rules")
          .select("id")
          .eq("company_id", companyId as string)
          .eq("active", true);

        // Get brokers count
        const { data: brokers } = await supabaseServer
          .from("brokers")
          .select("id")
          .eq("company_id", companyId as string);

        return res.status(200).json({
          lastSync: config?.last_sync || null,
          nextSync: config?.next_sync || null,
          rulesCount: rules?.length || 0,
          totalBrokers: brokers?.length || 0,
          activeConnections: 1, // Mock value
          avgSyncTime: 3.2, // Mock average sync time in seconds
          status: latestLog?.type === "ERROR" ? "error" : "connected",
        });
      } catch (error) {
        console.error("Error fetching enhanced sync status:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar status de sincronização" });
      }
    },
  );

  // Dynamic Metrics Routes
  app.get(
    "/admin/api/dynamic-metrics",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: metrics, error } = await supabaseServer
          .from("dynamic_metrics")
          .select("*")
          .eq("company_id", companyId as string)
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

  app.get(
    "/admin/api/dynamic-metrics-with-results",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get metrics with their latest results
        const { data: metrics, error } = await supabaseServer
          .from("dynamic_metrics")
          .select(`
            *,
            metric_results:metric_results!inner(
              id,
              valor_atual,
              status,
              leads_count,
              atingiu_meta,
              calculado_em,
              periodo_referencia
            )
          `)
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false });

        if (error && error.code !== "PGRST116") throw error;

        // Also get metrics without results
        const { data: metricsWithoutResults } = await supabaseServer
          .from("dynamic_metrics")
          .select("*")
          .eq("company_id", companyId as string)
          .not("id", "in", `(${(metrics || []).map(m => m.id).join(",") || "0"})`)
          .order("created_at", { ascending: false });

        // Format the response
        const formattedMetrics = [
          ...(metrics || []).map(metric => ({
            ...metric,
            current_result: metric.metric_results?.[0] || null
          })),
          ...(metricsWithoutResults || []).map(metric => ({
            ...metric,
            current_result: null
          }))
        ];

        return res.status(200).json(formattedMetrics);
      } catch (error) {
        console.error("Error fetching dynamic metrics with results:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar métricas com resultados" });
      }
    },
  );

  app.post(
    "/admin/api/dynamic-metrics",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = dynamicMetricFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({ 
            message: "Dados inválidos",
            errors: validation.error.errors 
          });
        }

        const { data: newMetric, error } = await supabaseServer
          .from("dynamic_metrics")
          .insert({
            company_id: companyId,
            ...validation.data,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(newMetric);
      } catch (error) {
        console.error("Error creating dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao criar métrica dinâmica" });
      }
    },
  );

  app.patch(
    "/admin/api/dynamic-metrics/:id",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const updateData = req.body;

        const { data: updatedMetric, error } = await supabaseServer
          .from("dynamic_metrics")
          .update(updateData)
          .eq("id", id)
          .eq("company_id", companyId as string)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json(updatedMetric);
      } catch (error) {
        console.error("Error updating dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar métrica dinâmica" });
      }
    },
  );

  app.delete(
    "/admin/api/dynamic-metrics/:id",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const { id } = req.params;

        // First delete any associated metric results
        await supabaseServer
          .from("metric_results")
          .delete()
          .eq("dynamic_metric_id", id)
          .eq("company_id", companyId as string);

        // Then delete the metric
        const { error } = await supabaseServer
          .from("dynamic_metrics")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId as string);

        if (error) throw error;
        return res.status(200).json({ message: "Métrica excluída com sucesso" });
      } catch (error) {
        console.error("Error deleting dynamic metric:", error);
        return res
          .status(500)
          .json({ message: "Erro ao excluir métrica dinâmica" });
      }
    },
  );

  // API endpoint for the ranking project to save metric results
  app.post(
    "/admin/api/metric-results",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const results = req.body; // Array of metric results

        // Validate that all metric IDs belong to the company
        const metricIds = results.map((r: any) => r.dynamic_metric_id);
        const { data: metrics } = await supabaseServer
          .from("dynamic_metrics")
          .select("id")
          .eq("company_id", companyId as string)
          .in("id", metricIds);

        const validMetricIds = (metrics || []).map(m => m.id);
        const validResults = results.filter((r: any) => 
          validMetricIds.includes(r.dynamic_metric_id)
        );

        if (validResults.length === 0) {
          return res.status(400).json({ 
            message: "Nenhuma métrica válida encontrada" 
          });
        }

        // Add company_id to all results
        const resultsWithCompany = validResults.map((result: any) => ({
          ...result,
          company_id: companyId,
        }));

        // Insert new results (this will create new records each time)
        const { data: savedResults, error } = await supabaseServer
          .from("metric_results")
          .insert(resultsWithCompany)
          .select();

        if (error) throw error;
        return res.status(201).json(savedResults);
      } catch (error) {
        console.error("Error saving metric results:", error);
        return res
          .status(500)
          .json({ message: "Erro ao salvar resultados das métricas" });
      }
    },
  );

  // Get pipeline stages for dynamic metrics configuration
  app.get(
    "/admin/api/kommo/pipeline-stages",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        // Get Kommo config to find selected pipelines
        const { data: kommoConfig } = await supabaseServer
          .schema("cf_kommo")
          .from("kommo_config")
          .select("pipeline_id")
          .eq("company_id", companyId as string)
          .single();

        if (!kommoConfig?.pipeline_id) {
          return res.status(200).json([]);
        }

        // Mock pipeline stages based on selected pipelines
        // In a real implementation, this would fetch from Kommo API
        const mockStages = [
          { id: 1, name: "Primeiro Contato", pipeline_id: 1, pipeline_name: "Vendas Principal" },
          { id: 2, name: "Qualificação", pipeline_id: 1, pipeline_name: "Vendas Principal" },
          { id: 3, name: "Proposta", pipeline_id: 1, pipeline_name: "Vendas Principal" },
          { id: 4, name: "Negociação", pipeline_id: 1, pipeline_name: "Vendas Principal" },
          { id: 5, name: "Fechamento", pipeline_id: 1, pipeline_name: "Vendas Principal" },
          { id: 6, name: "Lead Qualificado", pipeline_id: 2, pipeline_name: "Pré-Vendas" },
          { id: 7, name: "Agendamento", pipeline_id: 2, pipeline_name: "Pré-Vendas" },
          { id: 8, name: "Apresentação", pipeline_id: 2, pipeline_name: "Pré-Vendas" },
        ];

        // Filter stages by selected pipelines
        const selectedPipelines = Array.isArray(kommoConfig.pipeline_id) 
          ? kommoConfig.pipeline_id 
          : [kommoConfig.pipeline_id];
        
        const filteredStages = mockStages.filter(stage => 
          selectedPipelines.includes(stage.pipeline_id)
        );

        return res.status(200).json(filteredStages);
      } catch (error) {
        console.error("Error fetching pipeline stages:", error);
        return res
          .status(500)
          .json({ message: "Erro ao buscar estágios dos funis" });
      }
    },
  );

  // ====================
  // 🔔 NOTIFICAÇÕES E ALERTAS - NOVAS FUNCIONALIDADES
  // ====================

  // Notificações Routes
  app.get(
    "/admin/api/notifications",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const limit = parseInt(req.query.limit as string) || 20;
        const unreadOnly = req.query.unread === 'true';

        let query = supabaseServer
          .from("notifications")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (unreadOnly) {
          query = query.eq("read", false);
        }

        const { data: notifications, error } = await query;

        if (error) throw error;
        return res.status(200).json(notifications || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({ message: "Erro ao buscar notificações" });
      }
    },
  );

  app.post(
    "/admin/api/notifications",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = notificationFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados de notificação inválidos",
            errors: validation.error.format(),
          });
        }

        const { data: newNotification, error } = await supabaseServer
          .from("notifications")
          .insert({
            company_id: companyId,
            ...validation.data,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(newNotification);
      } catch (error) {
        console.error("Error creating notification:", error);
        return res.status(500).json({ message: "Erro ao criar notificação" });
      }
    },
  );

  app.patch(
    "/admin/api/notifications/:id/read",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const { id } = req.params;

        const { error } = await supabaseServer
          .from("notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("company_id", companyId as string);

        if (error) throw error;
        return res.status(200).json({ message: "Notificação marcada como lida" });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        return res.status(500).json({ message: "Erro ao marcar notificação como lida" });
      }
    },
  );

  app.patch(
    "/admin/api/notifications/mark-all-read",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { error } = await supabaseServer
          .from("notifications")
          .update({ read: true })
          .eq("company_id", companyId as string)
          .eq("read", false);

        if (error) throw error;
        return res.status(200).json({ message: "Todas as notificações marcadas como lidas" });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
      }
    },
  );

  // Configurações de Alertas Routes
  app.get(
    "/admin/api/alert-settings",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: settings, error } = await supabaseServer
          .from("alert_settings")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return res.status(200).json(settings || {});
      } catch (error) {
        console.error("Error fetching alert settings:", error);
        return res.status(500).json({ message: "Erro ao buscar configurações de alertas" });
      }
    },
  );

  app.post(
    "/admin/api/alert-settings",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = alertSettingsFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados de configuração inválidos",
            errors: validation.error.format(),
          });
        }

        // Check if settings already exist
        const { data: existingSettings, error: fetchError } = await supabaseServer
          .from("alert_settings")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (!existingSettings) {
          // Create new settings
          const { data: newSettings, error: insertError } = await supabaseServer
            .from("alert_settings")
            .insert({
              company_id: companyId,
              ...validation.data,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return res.status(201).json(newSettings);
        } else {
          // Update existing settings
          const { data: updatedSettings, error: updateError } = await supabaseServer
            .from("alert_settings")
            .update(validation.data)
            .eq("company_id", companyId as string)
            .select()
            .single();

          if (updateError) throw updateError;
          return res.status(200).json(updatedSettings);
        }
      } catch (error) {
        console.error("Error saving alert settings:", error);
        return res.status(500).json({ message: "Erro ao salvar configurações de alertas" });
      }
    },
  );

  // Auth system routes
  app.get(
    "/admin/api/auth-system",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: settings, error } = await supabaseServer
          .from("auth_system")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        // Never return the password field for security
        if (settings) {
          const { password, ...safeSettings } = settings;
          return res.status(200).json(safeSettings);
        }

        return res.status(200).json({});
      } catch (error) {
        console.error("Error fetching auth system settings:", error);
        return res.status(500).json({ message: "Erro ao buscar configurações do sistema de autenticação" });
      }
    },
  );

  app.post(
    "/admin/api/auth-system",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = authSystemFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados de configuração inválidos",
            errors: validation.error.format(),
          });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(validation.data.password, 10);

        // Check if settings already exist
        const { data: existingSettings, error: fetchError } = await supabaseServer
          .from("auth_system")
          .select("*")
          .eq("company_id", companyId as string)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        const settingsData = {
          password: hashedPassword,
          expire_at: validation.data.expire_at,
        };

        if (!existingSettings) {
          // Create new settings
          const { data: newSettings, error: insertError } = await supabaseServer
            .from("auth_system")
            .insert({
              company_id: companyId,
              ...settingsData,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          
          // Return without password
          const { password, ...safeSettings } = newSettings;
          return res.status(201).json(safeSettings);
        } else {
          // Update existing settings
          const { data: updatedSettings, error: updateError } = await supabaseServer
            .from("auth_system")
            .update(settingsData)
            .eq("company_id", companyId as string)
            .select()
            .single();

          if (updateError) throw updateError;
          
          // Return without password
          const { password, ...safeSettings } = updatedSettings;
          return res.status(200).json(safeSettings);
        }
      } catch (error) {
        console.error("Error saving auth system settings:", error);
        return res.status(500).json({ message: "Erro ao salvar configurações do sistema de autenticação" });
      }
    },
  );

  // Relatórios Automatizados Routes
  app.get(
    "/admin/api/automatic-reports",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;

        const { data: reports, error } = await supabaseServer
          .from("automatic_reports")
          .select("*")
          .eq("company_id", companyId as string)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return res.status(200).json(reports || []);
      } catch (error) {
        console.error("Error fetching automatic reports:", error);
        return res.status(500).json({ message: "Erro ao buscar relatórios automáticos" });
      }
    },
  );

  app.post(
    "/admin/api/automatic-reports",
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const validation = automaticReportFormSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            message: "Dados do relatório inválidos",
            errors: validation.error.format(),
          });
        }

        // Calculate next generation date based on frequency
        const now = new Date();
        const nextGeneration = new Date();
        
        switch (validation.data.frequency) {
          case 'daily':
            nextGeneration.setDate(now.getDate() + 1);
            break;
          case 'weekly':
            nextGeneration.setDate(now.getDate() + 7);
            break;
          case 'monthly':
            nextGeneration.setMonth(now.getMonth() + 1);
            break;
        }

        const { data: newReport, error } = await supabaseServer
          .from("automatic_reports")
          .insert({
            company_id: companyId,
            ...validation.data,
            next_generation: nextGeneration.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(newReport);
      } catch (error) {
        console.error("Error creating automatic report:", error);
        return res.status(500).json({ message: "Erro ao criar relatório automático" });
      }
    },
  );

  app.patch(
    "/admin/api/automatic-reports/:id",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const { id } = req.params;
        const updateData = req.body;

        const { data: updatedReport, error } = await supabaseServer
          .from("automatic_reports")
          .update(updateData)
          .eq("id", id)
          .eq("company_id", companyId as string)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json(updatedReport);
      } catch (error) {
        console.error("Error updating automatic report:", error);
        return res.status(500).json({ message: "Erro ao atualizar relatório automático" });
      }
    },
  );

  app.delete(
    "/admin/api/automatic-reports/:id",
    authenticateBrokerJWT,
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId;
        const { id } = req.params;

        const { error } = await supabaseServer
          .from("automatic_reports")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId as string);

        if (error) throw error;
        return res.status(200).json({ message: "Relatório automático excluído com sucesso" });
      } catch (error) {
        console.error("Error deleting automatic report:", error);
        return res.status(500).json({ message: "Erro ao excluir relatório automático" });
      }
    },
  );

  // Endpoint para gerar relatório manualmente
  app.post(
    "/admin/api/automatic-reports/:id/generate",
    companyContext,
    async (req: Request, res: Response) => {
      try {
        const companyId = (req as any).companyId as string;
        const { id } = req.params;

        const { data: report, error: reportError } = await supabaseServer
          .from("automatic_reports")
          .select("*")
          .eq("id", id)
          .eq("company_id", companyId)
          .single();

        throwIfError("load_automatic_report", reportError);

        if (report.report_type !== "full") {
          return res.status(200).json({ message: "Tipo de relatório não implementado" });
        }

        // ✅ Período baseado na frequência: daily | weekly | monthly
        const { start, end } = getRangeByFrequency(report.frequency);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        const LEADS_DATE_COL = "criado_em";

        const recipients: string[] = Array.isArray(report.email_recipients)
          ? report.email_recipients.filter((e: any) => typeof e === "string" && e.includes("@"))
          : [];

        const { data: brokers, error: brokersError } = await supabaseServer
          .from("brokers")
          .select("id, nome")
          .eq("cargo", "Corretor")
          .eq("company_id", companyId);

        throwIfError("load_brokers", brokersError);

        const rows: any[] = [];

        // unix range para repiques
        const startUnix = Math.floor(start.getTime() / 1000);
        const endUnix = Math.floor(end.getTime() / 1000);

        for (const broker of brokers ?? []) {
          // 1) leads do corretor no período
          const { data: leadIdsData, error: leadIdsError } = await supabaseServer
            .from("leads")
            .select("id")
            .eq("company_id", companyId)
            .eq("responsavel_id", broker.id)
            .gte(LEADS_DATE_COL as any, startISO)
            .lte(LEADS_DATE_COL as any, endISO);

          throwIfError(`lead_ids(${broker.id})`, leadIdsError);

          const leadIds = (leadIdsData ?? []).map((x: any) => x.id);
          const leads = leadIds.length;

          // 2) repiques no período (sem join, sem IN gigante)
          const { count: repCount, error: repError } = await supabaseServer
            .from("leads_com_repique")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("responsavel_id", broker.id)
            .gte("data_repique_unix" as any, startUnix)
            .lte("data_repique_unix" as any, endUnix);

          throwIfError(`repiques(${broker.id})`, repError);

          const repiques = repCount ?? 0;

          // 3) perdidos no período
          const { count: lostCount, error: lostError } = await supabaseServer
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("responsavel_id", broker.id)
            .eq("status_id", LOST_STATUS_ID)
            .gte(LEADS_DATE_COL as any, startISO)
            .lte(LEADS_DATE_COL as any, endISO);

          throwIfError(`perdidos(${broker.id})`, lostError);

          const perdidos = lostCount ?? 0;
          const total = leads + repiques;
          const soma = total + perdidos;

          rows.push({
            corretor: broker.nome ?? String(broker.id),
            leads,
            repiques,
            total,
            perdidos,
            soma,
          });
        }

        // TOTAL
        const totals = rows.reduce(
          (acc, r) => {
            acc.leads += r.leads;
            acc.repiques += r.repiques;
            acc.total += r.total;
            acc.perdidos += r.perdidos;
            acc.soma += r.soma;
            return acc;
          },
          { leads: 0, repiques: 0, total: 0, perdidos: 0, soma: 0 },
        );

        rows.push({ corretor: "TOTAL", ...totals });

        const periodLabel = `${formatBR(start)} a ${formatBR(end)}`;
        const pdfTitle = `RELATÓRIO ${periodLabel}`;

        const pdfPath = await generateFullReportPDF(rows, pdfTitle);

        // EMAIL
        if (recipients.length > 0) {
          await sendReportEmail({
            to: recipients,
            subject: `Relatório ${report.name} (${periodLabel})`,
            html: `<p>Segue em anexo o relatório <b>${report.name}</b> do período <b>${periodLabel}</b>.</p>`,
            attachmentPath: pdfPath,
            attachmentName: `relatorio-${report.name}-${report.frequency}-${start.getFullYear()}-${String(
              start.getMonth() + 1
            ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}.pdf`,
          });
        }

        await supabaseServer
          .from("automatic_reports")
          .update({ last_generated: new Date().toISOString() })
          .eq("id", id)
          .eq("company_id", companyId);

        await supabaseServer.from("notifications").insert({
          company_id: companyId,
          title: "Relatório Gerado",
          message: `Relatório "${report.name}" (${report.frequency}) (${periodLabel}) gerado${
            recipients.length ? ` e enviado para ${recipients.join(", ")}` : ""
          }.`,
          type: "success",
          category: "system",
          priority: "normal",
        });

        return res.status(200).json({
          message: "Relatório gerado com sucesso",
          frequency: report.frequency,
          period: { start: startISO, end: endISO },
          emailed_to: recipients,
          leads_date_col: LEADS_DATE_COL,
        });
      } catch (error: any) {
        console.error("Error generating report:", error?.message || error);
        return res.status(500).json({ message: error?.message || "Erro ao gerar relatório" });
      }
    }
  );

  app.post("/internal/cron/automatic-reports/run", async (req: Request, res: Response) => {
    try {
      const secret = req.headers["x-cron-secret"];
      if (!secret || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = await processAutomaticReports();
      return res.status(200).json({ ok: true, ...result });
    } catch (e: any) {
      console.error("cron automatic reports error:", e?.message || e);
      return res.status(500).json({ ok: false, message: e?.message || "Erro" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
