import { 
  users, type User, type InsertUser,
  rules, type Rule, type InsertRule,
  kommoConfig, type KommoConfig, type InsertKommoConfig,
  syncLogs, type SyncLog, type InsertSyncLog
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Rule operations
  getRule(id: number): Promise<Rule | undefined>;
  getAllRules(): Promise<Rule[]>;
  createRule(rule: InsertRule & { column_name: string }): Promise<Rule>;
  updateRule(id: number, rule: Partial<InsertRule>): Promise<Rule | undefined>;
  deleteRule(id: number): Promise<void>;
  
  // Kommo config operations
  getKommoConfig(): Promise<KommoConfig | undefined>;
  createKommoConfig(config: InsertKommoConfig): Promise<KommoConfig>;
  updateKommoConfig(config: KommoConfig): Promise<KommoConfig>;
  
  // Sync logs operations
  getSyncLogs(limit?: number): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  getLatestSyncLog(): Promise<SyncLog | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rulesList: Map<number, Rule>;
  private kommoConfigs: Map<number, KommoConfig>;
  private syncLogsList: SyncLog[];
  
  private userCurrentId: number;
  private ruleCurrentId: number;
  private configCurrentId: number;
  private syncLogCurrentId: number;

  constructor() {
    this.users = new Map();
    this.rulesList = new Map();
    this.kommoConfigs = new Map();
    this.syncLogsList = [];
    
    this.userCurrentId = 1;
    this.ruleCurrentId = 1;
    this.configCurrentId = 1;
    this.syncLogCurrentId = 1;
    
    // Initialize with some demo data
    this.rulesList.set(1, {
      id: 1,
      name: "Leads não respondidos em 5 dias",
      column_name: "leads_nao_respondidos_em_5_dias",
      points: -50,
      description: "Penaliza leads que não foram respondidos em 5 dias",
      created_at: new Date()
    });
    
    this.rulesList.set(2, {
      id: 2,
      name: "Conversão em menos de 24h",
      column_name: "conversao_em_menos_de_24h",
      points: 80,
      description: "Bonifica conversões rápidas em menos de 24h",
      created_at: new Date()
    });
    
    this.ruleCurrentId = 3;
    
    // Demo sync logs
    const now = new Date();
    this.syncLogsList = [
      {
        id: 1,
        timestamp: new Date(now.getTime() - 60000),
        type: "INFO",
        message: "Sincronização concluída com sucesso. 254 registros atualizados."
      },
      {
        id: 2,
        timestamp: new Date(now.getTime() - 65000),
        type: "DEBUG",
        message: "Aplicando regra 'Conversão em menos de 24h' em 58 registros."
      },
      {
        id: 3,
        timestamp: new Date(now.getTime() - 70000),
        type: "DEBUG",
        message: "Recebido response da API Kommo. Status 200. Tamanho: 1.2MB"
      }
    ];
    this.syncLogCurrentId = 4;
    
    // Demo Kommo config
    this.kommoConfigs.set(1, {
      id: 1,
      api_url: "https://api.kommo.com/v4/",
      access_token: "mocked_access_token",
      custom_endpoint: "/leads/list",
      sync_interval: 5,
      last_sync: new Date(now.getTime() - 60000),
      next_sync: new Date(now.getTime() + 240000)
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Rule methods
  async getRule(id: number): Promise<Rule | undefined> {
    return this.rulesList.get(id);
  }
  
  async getAllRules(): Promise<Rule[]> {
    return Array.from(this.rulesList.values());
  }
  
  async createRule(rule: InsertRule & { column_name: string }): Promise<Rule> {
    const id = this.ruleCurrentId++;
    const newRule: Rule = { 
      ...rule, 
      id, 
      created_at: new Date() 
    };
    this.rulesList.set(id, newRule);
    return newRule;
  }
  
  async updateRule(id: number, rule: Partial<InsertRule>): Promise<Rule | undefined> {
    const existingRule = this.rulesList.get(id);
    if (!existingRule) {
      return undefined;
    }
    
    const updatedRule = { ...existingRule, ...rule };
    this.rulesList.set(id, updatedRule);
    return updatedRule;
  }
  
  async deleteRule(id: number): Promise<void> {
    this.rulesList.delete(id);
  }
  
  // Kommo config methods
  async getKommoConfig(): Promise<KommoConfig | undefined> {
    // Return the first config (we only have one)
    return this.kommoConfigs.size > 0 
      ? Array.from(this.kommoConfigs.values())[0] 
      : undefined;
  }
  
  async createKommoConfig(config: InsertKommoConfig): Promise<KommoConfig> {
    const id = this.configCurrentId++;
    const now = new Date();
    const newConfig: KommoConfig = { 
      ...config, 
      id,
      last_sync: null,
      next_sync: new Date(now.getTime() + config.sync_interval * 60000) 
    };
    this.kommoConfigs.set(id, newConfig);
    return newConfig;
  }
  
  async updateKommoConfig(config: KommoConfig): Promise<KommoConfig> {
    this.kommoConfigs.set(config.id, config);
    return config;
  }
  
  // Sync logs methods
  async getSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    return this.syncLogsList
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const id = this.syncLogCurrentId++;
    const newLog: SyncLog = {
      ...log,
      id,
      timestamp: new Date()
    };
    this.syncLogsList.push(newLog);
    return newLog;
  }
  
  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    if (this.syncLogsList.length === 0) {
      return undefined;
    }
    
    return this.syncLogsList
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }
}

export const storage = new MemStorage();
