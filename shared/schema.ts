import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

export const companyBranding = pgTable("company_branding", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull()
    .unique(),
  primary_color: text("primary_color").default("#3b82f6"), // blue-500
  secondary_color: text("secondary_color").default("#1e40af"), // blue-700
  accent_color: text("accent_color").default("#22c55e"), // green-500
  logo_url: text("logo_url"),
  favicon_url: text("favicon_url"),
  company_name_display: text("company_name_display"),
  dashboard_title: text("dashboard_title").default("Ranking de Corretores"),
  theme_mode: text("theme_mode").default("light"), // light, dark, auto
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const rules = pgTable("rules", {
  id: integer("id").primaryKey(),
  nome: text("nome").notNull(),
  coluna_nome: text("coluna_nome").notNull().unique(),
  pontos: integer("pontos").notNull(),
  descricao: text("descricao"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const kommoConfig = pgTable("kommo_config", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id),
  api_url: text("api_url").notNull(),
  access_token: text("access_token").notNull(),
  custom_endpoint: text("custom_endpoint"),
  last_sync: timestamp("last_sync"),
  next_sync: timestamp("next_sync"),
  pipeline_id: jsonb("pipeline_id").$type<number[]>(),
  active: boolean("active").default(true),
});

export const syncLogs = pgTable("sync_logs", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id").references(() => companies.id),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull(), // INFO, DEBUG, ERROR
  message: text("message").notNull(),
});

// Table for company-specific rule configurations
export const companyRules = pgTable("company_rules", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  rule_id: integer("rule_id")
    .references(() => rules.id)
    .notNull(),
  pontos: integer("pontos").notNull(),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Table for company-specific custom rules
export const customRules = pgTable("custom_rules", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  nome: text("nome").notNull(),
  coluna_nome: text("coluna_nome").notNull(),
  pontos: integer("pontos").notNull(),
  descricao: text("descricao"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Table for dynamic metrics based on pipeline stages
export const dynamicMetrics = pgTable("dynamic_metrics", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  nome: text("nome").notNull(),
  pipeline_stage_id: integer("pipeline_stage_id").notNull(),
  pipeline_stage_name: text("pipeline_stage_name").notNull(),
  valor_minimo: integer("valor_minimo").notNull(),
  cor_sucesso: text("cor_sucesso").default("#22c55e"), // green-500
  cor_alerta: text("cor_alerta").default("#ef4444"), // red-500
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Table for storing metric results calculated by the ranking project
export const metricResults = pgTable("metric_results", {
  id: integer("id").primaryKey(),
  dynamic_metric_id: integer("dynamic_metric_id")
    .references(() => dynamicMetrics.id)
    .notNull(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  valor_atual: integer("valor_atual").notNull(),
  status: text("status").notNull(), // "sucesso", "alerta", "neutro"
  periodo_referencia: text("periodo_referencia"), // e.g., "2025-01", "2025-W01"
  leads_count: integer("leads_count").notNull().default(0),
  atingiu_meta: boolean("atingiu_meta").notNull().default(false),
  calculado_em: timestamp("calculado_em").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Sistema de Notificações e Alertas
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "success", "warning", "error", "info", "alert"
  priority: text("priority").notNull().default("normal"), // "low", "normal", "high", "urgent"
  category: text("category").notNull(), // "system", "ranking", "kommo", "metrics", "rules"
  read: boolean("read").default(false),
  action_url: text("action_url"), // URL para ação relacionada
  metadata: jsonb("metadata"), // dados extras como user_id, metric_id, etc
  expires_at: timestamp("expires_at"), // notificações que expiram
  created_at: timestamp("created_at").defaultNow(),
});

// Configurações de Alertas por Empresa
export const alertSettings = pgTable("alert_settings", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull()
    .unique(),
  email_alerts: boolean("email_alerts").default(true),
  browser_notifications: boolean("browser_notifications").default(true),
  daily_summary: boolean("daily_summary").default(true),
  sync_failure_alerts: boolean("sync_failure_alerts").default(true),
  ranking_change_alerts: boolean("ranking_change_alerts").default(false),
  metric_threshold_alerts: boolean("metric_threshold_alerts").default(true),
  admin_email: text("admin_email"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Relatórios Automatizados
export const automaticReports = pgTable("automatic_reports", {
  id: integer("id").primaryKey(),
  company_id: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // "daily", "weekly", "monthly"
  report_type: text("report_type").notNull(), // "ranking", "metrics", "kommo_sync", "full"
  email_recipients: text("email_recipients").array(), // array de emails
  include_charts: boolean("include_charts").default(true),
  include_comparisons: boolean("include_comparisons").default(true),
  active: boolean("active").default(true),
  last_generated: timestamp("last_generated"),
  next_generation: timestamp("next_generation"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertRuleSchema = createInsertSchema(rules).pick({
  nome: true,
  pontos: true,
  descricao: true,
});

export const insertKommoConfigSchema = createInsertSchema(kommoConfig).pick({
  api_url: true,
  access_token: true,
  custom_endpoint: true,
  pipeline_id: true,
  active: true,
});



export const insertSyncLogSchema = createInsertSchema(syncLogs).pick({
  type: true,
  message: true,
});

export const insertCompanyRuleSchema = createInsertSchema(companyRules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCompanyBrandingSchema = createInsertSchema(companyBranding).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCustomRuleSchema = createInsertSchema(customRules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertDynamicMetricSchema = createInsertSchema(dynamicMetrics).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  created_at: true,
});

export const insertAlertSettingsSchema = createInsertSchema(alertSettings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertAutomaticReportSchema = createInsertSchema(automaticReports).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertMetricResultSchema = createInsertSchema(metricResults).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;

export interface InsertKommoConfig {
  company_id: string;
  api_url: string;
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  token_expires_at?: Date;
  custom_endpoint?: string;
  pipeline_id?: string;
  active: boolean;
}
export interface KommoConfig {
  id: number;
  company_id: string;
  api_url: string;
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  token_expires_at?: Date;
  custom_endpoint?: string;
  pipeline_id?: string;
  active: boolean;
  last_sync?: Date;
  next_sync?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export type InsertCompanyRule = z.infer<typeof insertCompanyRuleSchema>;
export type CompanyRule = typeof companyRules.$inferSelect;

export type InsertCustomRule = z.infer<typeof insertCustomRuleSchema>;
export type CustomRule = typeof customRules.$inferSelect;

export type InsertDynamicMetric = z.infer<typeof insertDynamicMetricSchema>;
export type DynamicMetric = typeof dynamicMetrics.$inferSelect;

export type InsertMetricResult = z.infer<typeof insertMetricResultSchema>;
export type MetricResult = typeof metricResults.$inferSelect;

export type InsertCompanyBranding = z.infer<typeof insertCompanyBrandingSchema>;
export type CompanyBranding = typeof companyBranding.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertAlertSettings = z.infer<typeof insertAlertSettingsSchema>;
export type AlertSettings = typeof alertSettings.$inferSelect;

export type InsertAutomaticReport = z.infer<typeof insertAutomaticReportSchema>;
export type AutomaticReport = typeof automaticReports.$inferSelect;

// Validation schemas for forms
export const ruleFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  pontos: z
    .number()
    .min(-100, "O valor mínimo é -100")
    .max(100, "O valor máximo é 100"),
  descricao: z.string().optional(),
});

// Form schema for Kommo configuration
export const kommoConfigFormSchema = z.object({
  api_url: z.string().url("URL deve ser válida"),
  access_token: z.string().min(1, "Token de acesso é obrigatório"),
  refresh_token: z.string().min(1, "Refresh token é obrigatório"),
  client_id: z.string().min(1, "Client ID é obrigatório"),
  client_secret: z.string().min(1, "Client Secret é obrigatório"),
  custom_endpoint: z.string().optional(),
  pipeline_id: z.array(z.number()).min(1, "Selecione pelo menos um funil"),
  active: z.boolean().default(true),
});

export const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const registerFormSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z
      .string()
      .min(6, "A senha deve ter pelo menos 6 caracteres"),
    companyName: z
      .string()
      .min(2, "O nome da empresa deve ter pelo menos 2 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

// Updated company rule form schema
export const companyRuleFormSchema = z.object({
  rule_id: z.number().min(1, "ID da regra é obrigatório"),
  pontos: z
    .number()
    .min(-100, "O valor mínimo é -100")
    .max(100, "O valor máximo é 100"),
  active: z.boolean().default(true),
});

// Updated custom rule form schema  
export const customRuleFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  pontos: z
    .number()
    .min(-100, "O valor mínimo é -100")
    .max(100, "O valor máximo é 100"),
  descricao: z.string().optional(),
  active: z.boolean().default(true),
});

// Dynamic metrics form schema
export const dynamicMetricFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  pipeline_stage_id: z.number().min(1, "Selecione uma etapa do funil"),
  pipeline_stage_name: z.string().min(1, "Nome da etapa é obrigatório"),
  valor_minimo: z.number().min(0, "Valor mínimo deve ser positivo"),
  cor_sucesso: z.string().default("#22c55e"),
  cor_alerta: z.string().default("#ef4444"),
  active: z.boolean().default(true),
});

// Company branding form schema
export const companyBrandingFormSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve ser um código hexadecimal válido"),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve ser um código hexadecimal válido"),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve ser um código hexadecimal válido"),
  logo_url: z.string().url("URL do logo deve ser válida").optional().or(z.literal("")),
  favicon_url: z.string().url("URL do favicon deve ser válida").optional().or(z.literal("")),
  company_name_display: z.string().min(1, "Nome para exibição é obrigatório"),
  dashboard_title: z.string().min(1, "Título do dashboard é obrigatório"),
  theme_mode: z.enum(["light", "dark", "auto"]),
});

// Novos schemas para notificações e alertas
export const notificationFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  type: z.enum(["success", "warning", "error", "info", "alert"]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  category: z.enum(["system", "ranking", "kommo", "metrics", "rules"]),
  action_url: z.string().optional(),
  expires_at: z.string().optional(),
});

export const alertSettingsFormSchema = z.object({
  email_alerts: z.boolean().default(true),
  browser_notifications: z.boolean().default(true),
  daily_summary: z.boolean().default(true),
  sync_failure_alerts: z.boolean().default(true),
  ranking_change_alerts: z.boolean().default(false),
  metric_threshold_alerts: z.boolean().default(true),
  admin_email: z.string().email("Email inválido").optional(),
});

export const automaticReportFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  report_type: z.enum(["ranking", "metrics", "kommo_sync", "full"]),
  email_recipients: z.array(z.string().email("Email inválido")).min(1, "Pelo menos um destinatário é obrigatório"),
  include_charts: z.boolean().default(true),
  include_comparisons: z.boolean().default(true),
  active: z.boolean().default(true),
});