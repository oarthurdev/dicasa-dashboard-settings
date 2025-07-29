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

export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;

export type InsertKommoConfig = z.infer<typeof insertKommoConfigSchema>;
export type KommoConfig = typeof kommoConfig.$inferSelect;

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export type InsertCompanyRule = z.infer<typeof insertCompanyRuleSchema>;
export type CompanyRule = typeof companyRules.$inferSelect;

export type InsertCustomRule = z.infer<typeof insertCustomRuleSchema>;
export type CustomRule = typeof customRules.$inferSelect;

export type InsertDynamicMetric = z.infer<typeof insertDynamicMetricSchema>;
export type DynamicMetric = typeof dynamicMetrics.$inferSelect;

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
  api_url: z.string().min(1, "URL da API é obrigatória"),
  access_token: z.string().min(1, "Token de acesso é obrigatório"),
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
