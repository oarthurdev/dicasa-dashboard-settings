CREATE TABLE "company_rules" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"rule_id" integer NOT NULL,
	"pontos" integer NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_rules" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"coluna_nome" text NOT NULL,
	"pontos" integer NOT NULL,
	"descricao" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kommo_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"api_url" text NOT NULL,
	"access_token" text NOT NULL,
	"custom_endpoint" text,
	"sync_interval" integer DEFAULT 5,
	"last_sync" timestamp,
	"next_sync" timestamp,
	"sync_start_date" numeric,
	"sync_end_date" numeric,
	"pipeline_id" text,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" integer PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"coluna_nome" text NOT NULL,
	"pontos" integer NOT NULL,
	"descricao" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rules_coluna_nome_unique" UNIQUE("coluna_nome")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"timestamp" timestamp DEFAULT now(),
	"type" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_rules" ADD CONSTRAINT "company_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_rules" ADD CONSTRAINT "company_rules_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_rules" ADD CONSTRAINT "custom_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kommo_config" ADD CONSTRAINT "kommo_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;