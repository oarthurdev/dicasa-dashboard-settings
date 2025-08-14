import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";

import dotenv from "dotenv";
dotenv.config();

import cors from "cors";

const app = express();

const allowedDomains = ["replit.dev", "imobiliario.tec.br"];

// CORS
// Middleware de CORS com origem dinâmica
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, false);

      try {
        const url = new URL(origin);
        const domain = url.host;

        const isAllowed = allowedDomains.some(
          (baseDomain) =>
            domain === baseDomain || domain.endsWith("." + baseDomain),
        );

        if (isAllowed) {
          return callback(null, true);
        } else {
          return callback(new Error("Not allowed by CORS"));
        }
      } catch (err) {
        return callback(new Error("Invalid origin"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logger middleware para rotas /api
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add root redirect to admin
  app.get("/", (req, res) => {
    res.redirect("/admin");
  });

  // Registra suas rotas de API
  const server = await registerRoutes(app);

  // Middleware global de erro
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Detecta ambiente de produção ou desenvolvimento
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    serveStatic(app); // Serve o build da aplicação
  } else {
    await setupVite(app, server); // Configuração do Vite em dev
  }

  const port = process.env.PORT || 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(
        `🚀 Servindo em http://localhost:${port} (${isProduction ? "PROD" : "DEV"})`,
      );
    },
  );
})();
