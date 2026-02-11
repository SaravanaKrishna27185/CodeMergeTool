import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config/config";
import { connectDatabase } from "./config/database";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authMiddleware } from "./middleware/auth-middleware";

// Import routes
import authRoutes from "./routes/auth-routes";
import pipelineRoutes from "./routes/pipeline-routes";
import githubRoutes from "./routes/github-routes";
import gitlabRoutes from "./routes/gitlab";
import repositoryRoutes from "./routes/repository-routes";
import fileRoutes from "./routes/file-routes";
import fileCopyRoutes from "./routes/file-copy-routes";
import mergeRoutes from "./routes/merge-routes";
import integrationRoutes from "./routes/integration-routes";
import healthRoutes from "./routes/health-routes";
import settingsRoutes from "./routes/settings-routes";
import pipelineStatsRoutes from "./routes/pipeline-stats-routes";

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeConfig();
    this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeConfig(): void {
    // Load environment variables
    if (config.NODE_ENV === "development") {
      logger.info("Running in development mode");
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await connectDatabase();
      logger.info("Database connection initialized successfully");
    } catch (error) {
      logger.error("Database connection failed:", error);
      process.exit(1);
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: config.CORS_ORIGIN,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
        credentials: true,
        optionsSuccessStatus: 200, // For legacy browser support
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        success: false,
        error: {
          type: "RATE_LIMIT_ERROR",
          message: "Too many requests, please try again later.",
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use("/api", limiter);

    // Request logging middleware
    this.app.use((req, _res, next) => {
      console.log(
        `🌐 ${req.method} ${req.path} - Origin: ${req.get("Origin")} - User-Agent: ${req.get("User-Agent")?.substring(0, 50)}`
      );
      next();
    });

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging middleware
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (_req, res) => {
      res.status(200).json({
        success: true,
        message: "Code Merge Tool API is running",
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
      });
    });

    // API routes
    this.app.use("/api/health", healthRoutes);
    this.app.use("/api/pipeline", pipelineRoutes);
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/github", githubRoutes);
    this.app.use("/api/gitlab", authMiddleware, gitlabRoutes);
    this.app.use("/api/repositories", authMiddleware, repositoryRoutes);
    this.app.use("/api/files", authMiddleware, fileRoutes);
    this.app.use("/api/file-copy", authMiddleware, fileCopyRoutes);
    this.app.use("/api/merges", authMiddleware, mergeRoutes);
    this.app.use("/api/integrations", authMiddleware, integrationRoutes);
    this.app.use("/api/settings", authMiddleware, settingsRoutes);
    this.app.use("/api/pipeline-stats", authMiddleware, pipelineStatsRoutes);

    // API documentation endpoint (placeholder)
    this.app.get("/api/docs", (_req, res) => {
      res.status(200).json({
        success: true,
        message: "API Documentation will be available here",
        version: "1.0.0",
        endpoints: {
          auth: "/api/auth",
          repositories: "/api/repositories",
          files: "/api/files",
          merges: "/api/merges",
          integrations: "/api/integrations",
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = config.PORT;
    this.app.listen(port, () => {
      logger.info(`🚀 Code Merge Tool API server is running on port ${port}`);
      logger.info(`📖 Health check: http://localhost:${port}/health`);
      logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`);
    });
  }
}

export default App;
