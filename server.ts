import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createNetServer } from "node:net";
import http from "http";
import { correlationAndLoggerMiddleware, log } from "./server/middleware/logger";
import { registerRoutes } from "./server/routes";

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const findAvailablePort = async (preferredPort: number, host: string) => {
  const isPortFree = (port: number) =>
    new Promise<boolean>((resolve) => {
      const tester = createNetServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, host);
    });

  let portToTry = preferredPort;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isPortFree(portToTry)) {
      return portToTry;
    }
    portToTry += 1;
  }

  throw new Error(`Unable to find an available port starting from ${preferredPort}`);
};

export async function createServerApp() {
  const app = express();
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
  const port = await findAvailablePort(preferredPort, host);

  // Render (and most PaaS hosts) run this app behind a reverse proxy.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  // Security Headers
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://apis.google.com", "https://*.firebaseapp.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.firebasestorage.app", "https://*.googleusercontent.com"],
        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "wss://*.firebaseio.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://generativelanguage.googleapis.com",
          "https://*.firebaseapp.com"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: [
          "'self'",
          "https://*.firebaseapp.com",
          "https://*.web.app",
          "https://accounts.google.com",
          "https://apis.google.com"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      }
    } : false
  }));

  // CORS Configuration
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    'https://jeeosv1.web.app',
    'https://jeeosv1.firebaseapp.com',
  ].filter((v): v is string => Boolean(v) && v !== 'MY_APP_URL');

  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      : true,
    credentials: true,
  }));

  // Structured Logging & Correlation ID Middleware
  app.use(correlationAndLoggerMiddleware);

  // Request Body Parsers (Synchronized with 25MB vision/PDF upload schemas to prevent DoS)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Register All Domain API Routes
  registerRoutes(app);

  return app;
}

async function startServer() {
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
  const port = await findAvailablePort(preferredPort, host);

  const app = await createServerApp();
  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        port,
        strictPort: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Return 404 for missing static assets instead of serving index.html
    app.use('/assets', (req, res) => {
      res.status(404).send('Asset not found');
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, host, () => {
    const fallbackMessage = port !== preferredPort ? ` (fallback from ${preferredPort})` : "";
    log('info', `Server running on http://localhost:${port}${fallbackMessage}`);
  });

  // Graceful shutdown: drain active connections before termination
  const gracefulShutdown = (signal: string) => {
    log('info', `[${signal}] Graceful shutdown initiated...`);
    httpServer.close(() => {
      log('info', '[Shutdown] HTTP server closed. All connections drained.');
      process.exit(0);
    });
    setTimeout(() => {
      log('error', '[Shutdown] Forced exit after 10s timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
