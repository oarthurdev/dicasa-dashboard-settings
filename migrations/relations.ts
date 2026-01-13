import { relations } from "drizzle-orm/relations";
import { companiesInCfCompanies, activities, brokers, companyRules, rules, companyBranding, componentFilters, customRules, leads, metricResults, dynamicMetrics, stagesList, syncLogs, brokerPoints, authSystem } from "./schema";

export const activitiesRelations = relations(activities, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [activities.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const companiesInCfCompaniesRelations = relations(companiesInCfCompanies, ({many}) => ({
	activities: many(activities),
	brokers: many(brokers),
	companyRules: many(companyRules),
	companyBrandings: many(companyBranding),
	componentFilters: many(componentFilters),
	customRules: many(customRules),
	leads: many(leads),
	metricResults: many(metricResults),
	stagesLists: many(stagesList),
	syncLogs: many(syncLogs),
	brokerPoints: many(brokerPoints),
	dynamicMetrics: many(dynamicMetrics),
	authSystems: many(authSystem),
}));

export const brokersRelations = relations(brokers, ({one, many}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [brokers.companyId],
		references: [companiesInCfCompanies.id]
	}),
	leads: many(leads),
	brokerPoints: many(brokerPoints),
}));

export const companyRulesRelations = relations(companyRules, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [companyRules.companyId],
		references: [companiesInCfCompanies.id]
	}),
	rule: one(rules, {
		fields: [companyRules.ruleId],
		references: [rules.id]
	}),
}));

export const rulesRelations = relations(rules, ({many}) => ({
	companyRules: many(companyRules),
}));

export const companyBrandingRelations = relations(companyBranding, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [companyBranding.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const componentFiltersRelations = relations(componentFilters, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [componentFilters.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const customRulesRelations = relations(customRules, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [customRules.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const leadsRelations = relations(leads, ({one}) => ({
	broker: one(brokers, {
		fields: [leads.responsavelId],
		references: [brokers.id]
	}),
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [leads.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const metricResultsRelations = relations(metricResults, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [metricResults.companyId],
		references: [companiesInCfCompanies.id]
	}),
	dynamicMetric: one(dynamicMetrics, {
		fields: [metricResults.dynamicMetricId],
		references: [dynamicMetrics.id]
	}),
}));

export const dynamicMetricsRelations = relations(dynamicMetrics, ({one, many}) => ({
	metricResults: many(metricResults),
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [dynamicMetrics.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const stagesListRelations = relations(stagesList, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [stagesList.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const syncLogsRelations = relations(syncLogs, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [syncLogs.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const brokerPointsRelations = relations(brokerPoints, ({one}) => ({
	broker: one(brokers, {
		fields: [brokerPoints.id],
		references: [brokers.id]
	}),
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [brokerPoints.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));

export const authSystemRelations = relations(authSystem, ({one}) => ({
	companiesInCfCompany: one(companiesInCfCompanies, {
		fields: [authSystem.companyId],
		references: [companiesInCfCompanies.id]
	}),
}));