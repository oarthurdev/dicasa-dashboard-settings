import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

var companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  created_at: timestamp("created_at").defaultNow()
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  company_id: integer("company_id").references(() => companies.id),
  role: text("role").notNull().default("admin"),
  created_at: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  company_id: integer("company_id").references(() => companies.id),
  email: text("email"),
  full_name: text("full_name"),
  role: text("role").notNull().default("user"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  coluna_nome: text("coluna_nome").notNull().unique(),
  pontos: integer("pontos").notNull(),
  descricao: text("descricao"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const kommoConfig = pgTable("kommo_config", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id").references(() => companies.id),
  api_url: text("api_url").notNull(),
  access_token: text("access_token").notNull(),
  custom_endpoint: text("custom_endpoint"),
  sync_interval: integer("sync_interval").default(5),
  last_sync: timestamp("last_sync"),
  next_sync: timestamp("next_sync"),
  sync_start_date: numeric("sync_start_date"),
  sync_end_date: numeric("sync_end_date"),
  pipeline_id: text("pipeline_id"),
  active: boolean("active").default(true),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull(), // INFO, DEBUG, ERROR
  message: text("message").notNull(),
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
  sync_interval: true,
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).pick({
  type: true,
  message: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;

export type InsertKommoConfig = z.infer<typeof insertKommoConfigSchema>;
export type KommoConfig = typeof kommoConfig.$inferSelect;

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

// Validation schemas for forms
export const ruleFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  pontos: z
    .number()
    .min(-100, "O valor mínimo é -100")
    .max(100, "O valor máximo é 100"),
  descricao: z.string().optional(),
});

export const kommoConfigFormSchema = z
  .object({
    api_url: z.string().url("URL inválida"),
    access_token: z.string().min(5, "Token inválido"),
    custom_endpoint: z.string().optional(),
    sync_interval: z
      .number()
      .min(1, "Mínimo 1 minuto")
      .max(60, "Máximo 60 minutos"),
    sync_start_date: z.union([z.date(), z.number()]),
    sync_end_date: z.union([z.date(), z.number()]),
    active: z.boolean().default(true),
    pipeline_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.sync_start_date && data.sync_end_date) {
        return data.sync_end_date > data.sync_start_date;
      }
      return true;
    },
    {
      message: "A data final deve ser maior que a data inicial",
      path: ["sync_end_date"],
    },
  );

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