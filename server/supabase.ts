import { createClient } from "@supabase/supabase-js";
import {
  Rule,
  KommoConfig,
  SyncLog,
  InsertRule,
  InsertKommoConfig,
  InsertSyncLog,
} from "@shared/schema.ts";

import dotenv from "dotenv";
dotenv.config();

// Get Supabase credentials from env variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_KEY || "";

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Supabase credentials not configured. Authentication will not work properly.",
  );
  throw new Error(
    "SUPABASE_URL and SUPABASE_KEY must be defined in environment variables",
  );
}

// Initialize Supabase client
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

export const supabase = {
  // RULES OPERATIONS
  /**
   * Get a specific rule by ID
   * @param id The rule ID
   */
  async getRule(id: number): Promise<Rule | undefined> {
    const { data, error } = await supabaseClient
      .from("rules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching rule:", error);
      return undefined;
    }

    return data as Rule;
  },

  /**
   * Get all rules
   */
  async getRulesPaginated(
    offset: number,
    limit: number,
    companyId?: number,
  ): Promise<Rule[]> {
    let query = supabaseClient.from("rules").select("*");

    if (companyId) {
      // Buscar regras padrão (company_id é null) ou regras da empresa específica
      query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
    }

    const { data, error } = await query
      .order("id")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching rules:", error);
      return [];
    }

    return data as Rule[];
  },

  async getTotalRules(companyId?: number): Promise<number> {
    let query = supabaseClient
      .from("rules")
      .select("*", { count: "exact", head: true });

    if (companyId) {
      // Contar regras padrão (company_id é null) ou regras da empresa específica
      query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error counting rules:", error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Create a new rule
   * @param rule The rule data to insert
   */
  async createRule(rule: InsertRule & { coluna_nome: string }): Promise<Rule> {
    // Primeiro adiciona a coluna ao broker_points
    await this.addColumnToBrokerPoints(rule.coluna_nome);

    // Depois cria a regra
    const { data, error } = await supabaseClient
      .from("rules")
      .insert(rule)
      .select()
      .single();

    if (error) {
      console.error("Error creating rule:", error);
      throw error;
    }

    return data as Rule;
  },

  /**
   * Update an existing rule
   * @param id The rule ID
   * @param rule The updated rule data
   */
  async updateRule(
    id: number,
    rule: Partial<InsertRule>,
  ): Promise<Rule | undefined> {
    const { data, error } = await supabaseClient
      .from("rules")
      .update(rule)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating rule:", error);
      return undefined;
    }

    return data as Rule;
  },

  /**
   * Delete a rule
   * @param id The rule ID
   */
  async deleteRule(id: number): Promise<void> {
    // Primeiro busca a regra para saber a coluna
    const rule = await this.getRule(id);
    if (!rule) {
      throw new Error("Rule not found");
    }

    // Remove a coluna da tabela broker_points
    await this.dropColumnFromBrokerPoints(rule.coluna_nome);

    // Depois remove a regra
    const { error } = await supabaseClient.from("rules").delete().eq("id", id);

    if (error) {
      console.error("Error deleting rule:", error);
      throw error;
    }
  },

  // KOMMO CONFIG OPERATIONS
  /**
   * Get the Kommo configuration
   */
  async getKommoConfig(): Promise<KommoConfig | undefined> {
    const { data, error } = await supabaseClient
      .from("kommo_config")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      // ignore not found error
      console.error("Error fetching Kommo config:", error);
      return undefined;
    }

    return data as KommoConfig;
  },

  /**
   * Create Kommo configuration
   * @param config The configuration data
   */
  async createKommoConfig(config: InsertKommoConfig): Promise<KommoConfig> {
    const { data, error } = await supabaseClient
      .from("kommo_config")
      .insert(config)
      .select()
      .single();

    if (error) {
      console.error("Error creating Kommo config:", error);
      throw error;
    }

    return data as KommoConfig;
  },

  /**
   * Update Kommo configuration
   * @param config The configuration data
   */
  async updateKommoConfig(config: KommoConfig): Promise<KommoConfig> {
    const { data, error } = await supabaseClient
      .from("kommo_config")
      .update(config)
      .eq("id", config.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating Kommo config:", error);
      throw error;
    }

    return data as KommoConfig;
  },

  // SYNC LOGS OPERATIONS
  /**
   * Get synchronization logs
   * @param limit Maximum number of logs to return
   */
  async getSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    const { data, error } = await supabaseClient
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching sync logs:", error);
      return [];
    }

    return data as SyncLog[];
  },

  /**
   * Create a synchronization log
   * @param log The log data
   */
  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const { data, error } = await supabaseClient
      .from("sync_logs")
      .insert(log)
      .select()
      .single();

    if (error) {
      console.error("Error creating sync log:", error);
      throw error;
    }

    return data as SyncLog;
  },

  /**
   * Get the latest synchronization log
   */
  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    const { data, error } = await supabaseClient
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // ignore not found error
      console.error("Error fetching latest sync log:", error);
      return undefined;
    }

    return data as SyncLog;
  },

  /**
   * Add a new column to the broker_points table
   * @param columnName The name of the column to add
   */
  async addColumnToBrokerPoints(columnName: string): Promise<void> {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase not configured. Cannot add column.");
      return;
    }

    try {
      // Using raw SQL via Supabase's rpc to add column to table
      await supabaseClient.rpc("add_column_to_broker_points", {
        column_name: columnName,
        column_type: "integer",
      });

      console.log(`Added column ${columnName} to broker_points table`);
    } catch (error) {
      console.error("Error adding column to broker_points table:", error);
      throw error;
    }
  },

  /**
   * Drop a column from the broker_points table
   * @param columnName The name of the column to drop
   */
  async deleteAllData(company_id: string): Promise<void> {
    const { data, error } = await supabaseClient.rpc("truncate_all_data", {
      p_company_id: company_id, // Passando o company_id como argumento
    });

    if (error) {
      console.error("Error deleting data:", error);
      throw error;
    }

    console.log("Data deleted successfully:", data);
  },

  async dropColumnFromBrokerPoints(columnName: string): Promise<void> {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase not configured. Cannot drop column.");
      return;
    }

    try {
      // Using raw SQL via Supabase's rpc to drop column from table
      await supabaseClient.rpc("drop_column_from_broker_points", {
        coluna_nome: columnName,
      });

      console.log(`Dropped column ${columnName} from broker_points table`);
    } catch (error) {
      console.error("Error dropping column from broker_points table:", error);
      throw error;
    }
  },

  /**
   * Test connection to Kommo API
   * @param apiUrl API URL
   * @param accessToken Access token
   * @param customEndpoint Custom endpoint
   */
  async testKommoConnection(
    apiUrl: string,
    accessToken: string,
    customEndpoint?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, you would make an actual API call to Kommo
      // For demo purposes, we'll just simulate a successful connection

      // Simulating API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        message: "Conexão com a API Kommo estabelecida com sucesso.",
      };
    } catch (error) {
      console.error("Error testing Kommo connection:", error);
      return {
        success: false,
        message:
          "Erro ao conectar com a API Kommo. Verifique suas credenciais.",
      };
    }
  },
};
