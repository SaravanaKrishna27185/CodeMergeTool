import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Configuration schema for validation
const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(1021),

  // Database
  MONGODB_URI: z.string().default("mongodb://localhost:27017/code-merge-tool"),
  MONGODB_TEST_URI: z
    .string()
    .default("mongodb://localhost:27017/code-merge-tool-test"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("24h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z
    .string()
    .default("http://localhost:1021/api/auth/github/callback"),

  // GitLab OAuth
  GITLAB_CLIENT_ID: z.string().optional(),
  GITLAB_CLIENT_SECRET: z.string().optional(),
  GITLAB_CALLBACK_URL: z
    .string()
    .default("http://localhost:1021/api/auth/gitlab/callback"),

  // Session
  SESSION_SECRET: z.string().min(32),

  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
  UPLOAD_PATH: z.string().default("./uploads"),
  TEMP_PATH: z.string().default("./temp"),

  // Repository
  REPOS_PATH: z.string().default("./repositories"),
  MAX_REPO_SIZE: z.coerce.number().default(104857600), // 100MB

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:1011"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FILE: z.string().default("logs/app.log"),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Webhooks
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITLAB_WEBHOOK_SECRET: z.string().optional(),
});

// Validate and export configuration
export const config = configSchema.parse({
  NODE_ENV: process.env["NODE_ENV"],
  PORT: process.env["PORT"],

  MONGODB_URI: process.env["MONGODB_URI"],
  MONGODB_TEST_URI: process.env["MONGODB_TEST_URI"],

  REDIS_URL: process.env["REDIS_URL"],

  JWT_SECRET: process.env["JWT_SECRET"] || "",
  JWT_REFRESH_SECRET: process.env["JWT_REFRESH_SECRET"] || "",
  JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"],
  JWT_REFRESH_EXPIRES_IN: process.env["JWT_REFRESH_EXPIRES_IN"],

  GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
  GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
  GITHUB_CALLBACK_URL: process.env["GITHUB_CALLBACK_URL"],

  GITLAB_CLIENT_ID: process.env["GITLAB_CLIENT_ID"],
  GITLAB_CLIENT_SECRET: process.env["GITLAB_CLIENT_SECRET"],
  GITLAB_CALLBACK_URL: process.env["GITLAB_CALLBACK_URL"],

  SESSION_SECRET: process.env["SESSION_SECRET"] || "",

  MAX_FILE_SIZE: process.env["MAX_FILE_SIZE"],
  UPLOAD_PATH: process.env["UPLOAD_PATH"],
  TEMP_PATH: process.env["TEMP_PATH"],

  REPOS_PATH: process.env["REPOS_PATH"],
  MAX_REPO_SIZE: process.env["MAX_REPO_SIZE"],

  RATE_LIMIT_WINDOW_MS: process.env["RATE_LIMIT_WINDOW_MS"],
  RATE_LIMIT_MAX_REQUESTS: process.env["RATE_LIMIT_MAX_REQUESTS"],

  CORS_ORIGIN: process.env["CORS_ORIGIN"],

  LOG_LEVEL: process.env["LOG_LEVEL"],
  LOG_FILE: process.env["LOG_FILE"],

  SMTP_HOST: process.env["SMTP_HOST"],
  SMTP_PORT: process.env["SMTP_PORT"],
  SMTP_USER: process.env["SMTP_USER"],
  SMTP_PASS: process.env["SMTP_PASS"],

  GITHUB_WEBHOOK_SECRET: process.env["GITHUB_WEBHOOK_SECRET"],
  GITLAB_WEBHOOK_SECRET: process.env["GITLAB_WEBHOOK_SECRET"],
});

export type Config = z.infer<typeof configSchema>;
