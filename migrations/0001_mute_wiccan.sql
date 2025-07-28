CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_subdomain_unique" UNIQUE("subdomain")
);
