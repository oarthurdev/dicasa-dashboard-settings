import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  column_name: text("column_name").notNull().unique(),
  points: integer("points").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
});

export const kommoConfig = pgTable("kommo_config", {
  id: serial("id").primaryKey(),
  api_url: text("api_url").notNull(),
  access_token: text("access_token").notNull(),
  custom_endpoint: text("custom_endpoint"),
  sync_interval: integer("sync_interval").default(5),
  last_sync: timestamp("last_sync"),
  next_sync: timestamp("next_sync"),
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
  name: true,
  points: true,
  description: true,
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
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  points: z.number().min(-100, "O valor mínimo é -100").max(100, "O valor máximo é 100"),
  description: z.string().optional(),
});

export const kommoConfigFormSchema = z.object({
  api_url: z.string().url("URL inválida"),
  access_token: z.string().min(5, "Token inválido"),
  custom_endpoint: z.string().optional(),
  sync_interval: z.number().min(1, "Mínimo 1 minuto").max(60, "Máximo 60 minutos"),
});

export const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
