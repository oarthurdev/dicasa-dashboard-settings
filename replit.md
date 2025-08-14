# Replit.md

## Overview

This is a full-stack web application that serves as a configuration dashboard for a Python Streamlit application. The system manages rules and configuration settings for connecting to the Kommo API, enabling data synchronization between Kommo and Supabase every 5 minutes. The application features a React frontend with Express.js backend, using Drizzle ORM with PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
- **Frontend**: React 18 with TypeScript, using Vite as the build tool
- **Backend**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Supabase Auth with JWT tokens
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management

### Development Setup
- Uses ES modules throughout the application
- TypeScript configuration covers client, server, and shared code
- Development server runs with tsx for TypeScript execution
- Production build uses esbuild for the server and Vite for the client

## Key Components

### Frontend Architecture
- **Component Structure**: Uses shadcn/ui components with Radix UI primitives
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query for API calls and caching
- **Theming**: Dark theme as default with CSS custom properties

### Backend Architecture
- **API Structure**: RESTful API with Express.js
- **Database Layer**: Drizzle ORM with connection pooling via Neon serverless
- **Authentication Middleware**: JWT validation using Supabase
- **Company Context**: Multi-tenant support with company-based data isolation

### Database Schema
- **Companies**: Multi-tenant company management
- **Users/Profiles**: User authentication and profile management
- **Rules**: Business rules with dynamic column creation and point values
- **Kommo Config**: API configuration for Kommo integration
- **Sync Logs**: Monitoring and logging of synchronization activities

## Data Flow

### Authentication Flow
1. Users authenticate via Supabase Auth
2. JWT tokens are stored in localStorage
3. API requests include Bearer token in Authorization header
4. Company context is determined from subdomain

### Rules Management Flow
1. Users create rules with names, descriptions, and point values
2. Column names are auto-generated using snake_case conversion
3. Rules dynamically create database columns in broker_points table
4. Point values can be updated with real-time validation

### Configuration Flow
1. Kommo API settings are stored securely
2. Connection testing validates API credentials
3. Configuration changes trigger system-wide updates
4. Sync monitoring tracks integration status

## External Dependencies

### Core Dependencies
- **Supabase**: Authentication and potential database hosting
- **Neon Database**: PostgreSQL hosting with serverless connections
- **Drizzle**: Type-safe ORM with schema migrations
- **TanStack Query**: Server state management and caching

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React Hook Form**: Form state management with validation

### Development Dependencies
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the application
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Build Process
- Client builds to `/dist` directory using Vite
- Server bundles to `/dist/index.js` using ESBuild
- Static assets are served from the build output

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_KEY`: Supabase anon key
- `VITE_ADMIN_API_URL`: Backend API URL
- `JWT_SECRET`: JWT signing secret

### Production Configuration
- CORS configured for specific domains (replit.dev, imobiliario.tec.br)
- Company context middleware for multi-tenant support
- Database migrations managed through Drizzle Kit
- Static file serving with Express in production

### Database Migrations
- Schema definitions in `/shared/schema.ts`
- Migrations output to `/migrations` directory
- Uses `drizzle-kit push` for schema synchronization
- PostgreSQL dialect with Neon serverless adapter

## Recent Changes
- **2025-01-14**: Successfully migrated from Replit Agent to standard Replit environment:
  - Enhanced visual design with glassmorphism effects, dynamic gradients, and smooth animations
  - Implemented modern UI with Inter font, custom CSS properties, and advanced styling
  - Fixed CORS configuration for proper local development
  - Updated color scheme with purple-themed primary colors and sophisticated visual elements
  - Added floating background orbs, enhanced navigation effects, and interactive card animations
  - Completely redesigned Welcome page with hero section and enhanced action cards
  - Project now running successfully in standard Replit environment
- **2025-01-29**: Enhanced Dynamic Metrics system for proper integration with ranking project:
  - Added metric_results table to store calculated values from ranking project
  - Created comprehensive Dynamic Metrics page with configuration and results overview
  - Implemented API endpoints for metric configuration and result storage
  - Added pipeline stage integration for metric configuration
  - Clear separation: this system configures metrics, ranking project calculates values
  - Results are linked to metric configurations and show achievement status
- **2025-01-29**: Added Company Branding system with multi-tenant theming:
  - company_branding table for custom colors, logos, and theme settings
  - API endpoints for branding configuration management
  - Enhanced Welcome dashboard with real-time statistics
  - Improved Monitoring page with detailed logs and system status
- **2025-01-28**: Migrated from Replit Agent to standard Replit environment for better compatibility and security
- **2025-01-28**: Implemented company-specific rules feature allowing each company to:
  - Configure custom point values for general system rules
  - Create custom rules specific to their business needs
  - Manage both general and custom rules in separate tabs
  - Added new database tables: company_rules, custom_rules
  - Enhanced Rules page with tabbed interface for better organization