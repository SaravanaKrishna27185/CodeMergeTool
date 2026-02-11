import mongoose from "mongoose";
import { config } from "../config/config";
import { logger } from "../config/logger";
import { User } from "../models/user-model";
import { Repository } from "../models/repository-model";
import { Merge } from "../models/merge-model";

/**
 * Database initialization and seeding utility
 */
export class DatabaseService {
  /**
   * Initialize database connection and create indexes
   */
  static async initialize(): Promise<void> {
    try {
      // Connect to MongoDB
      const mongoUri =
        config.NODE_ENV === "test"
          ? config.MONGODB_TEST_URI
          : config.MONGODB_URI;

      await mongoose.connect(mongoUri);
      logger.info(`✅ Connected to MongoDB: ${mongoUri}`);

      // Create database indexes for better performance
      await this.createIndexes();
      logger.info("✅ Database indexes created successfully");
    } catch (error) {
      logger.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  /**
   * Create database indexes for optimal performance
   */
  private static async createIndexes(): Promise<void> {
    try {
      // User indexes
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ isActive: 1 });
      await User.collection.createIndex({ createdAt: -1 });
      await User.collection.createIndex({ lastLoginAt: -1 });

      // Repository indexes
      await Repository.collection.createIndex({ owner: 1 });
      await Repository.collection.createIndex({ platform: 1 });
      await Repository.collection.createIndex(
        { "integration.externalId": 1 },
        { sparse: true }
      );
      await Repository.collection.createIndex({ isActive: 1 });
      await Repository.collection.createIndex({ createdAt: -1 });
      await Repository.collection.createIndex({ updatedAt: -1 });

      // Compound indexes for repositories
      await Repository.collection.createIndex({ owner: 1, platform: 1 });
      await Repository.collection.createIndex({ owner: 1, isActive: 1 });

      // Merge indexes
      await Merge.collection.createIndex({ user: 1 });
      await Merge.collection.createIndex({ sourceRepository: 1 });
      await Merge.collection.createIndex({ targetRepository: 1 });
      await Merge.collection.createIndex({ status: 1 });
      await Merge.collection.createIndex({ createdAt: -1 });
      await Merge.collection.createIndex({ updatedAt: -1 });

      // Compound indexes for merges
      await Merge.collection.createIndex({ user: 1, status: 1 });
      await Merge.collection.createIndex({
        sourceRepository: 1,
        targetRepository: 1,
      });

      logger.info("All database indexes created successfully");
    } catch (error) {
      logger.error("Failed to create database indexes:", error);
      throw error;
    }
  }

  /**
   * Seed database with initial data (for development/testing)
   */
  static async seedDatabase(): Promise<void> {
    try {
      // Check if database is already seeded
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        logger.info("Database already contains data, skipping seeding");
        return;
      }

      logger.info("Seeding database with initial data...");

      // Create admin user
      const adminUser = new User({
        email: "admin@codemergetool.com",
        password:
          "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeUZBHRQjkuV3D6U6", // "admin123"
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
      });
      await adminUser.save();

      // Create test user
      const testUser = new User({
        email: "test@example.com",
        password:
          "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeUZBHRQjkuV3D6U6", // "test123"
        firstName: "Test",
        lastName: "User",
        role: "user",
        isActive: true,
      });
      await testUser.save();

      logger.info("✅ Database seeded successfully");
      logger.info("Default users created:");
      logger.info("  - Admin: admin@codemergetool.com / admin123");
      logger.info("  - Test: test@example.com / test123");
    } catch (error) {
      logger.error("❌ Database seeding failed:", error);
      throw error;
    }
  }

  /**
   * Clear database (for testing purposes)
   */
  static async clearDatabase(): Promise<void> {
    try {
      await User.deleteMany({});
      await Repository.deleteMany({});
      await Merge.deleteMany({});
      logger.info("✅ Database cleared successfully");
    } catch (error) {
      logger.error("❌ Database clearing failed:", error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info("✅ Disconnected from MongoDB");
    } catch (error) {
      logger.error("❌ Database disconnection failed:", error);
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  static async healthCheck(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      };

      if (state === 1) {
        // Additional health checks
        const dbStats = await mongoose.connection.db.admin().ping();

        return {
          status: "healthy",
          message: "Database connection is active",
          details: {
            state: states[state as keyof typeof states],
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name,
            ping: dbStats,
          },
        };
      } else {
        return {
          status: "unhealthy",
          message: `Database connection is ${states[state as keyof typeof states]}`,
          details: {
            state: states[state as keyof typeof states],
          },
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: "Database health check failed",
        details: { error: error },
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getStatistics(): Promise<any> {
    try {
      const userCount = await User.countDocuments();
      const repositoryCount = await Repository.countDocuments();
      const mergeCount = await Merge.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const activeRepositories = await Repository.countDocuments({
        isActive: true,
      });

      const dbStats = await mongoose.connection.db.stats();

      return {
        collections: {
          users: userCount,
          repositories: repositoryCount,
          merges: mergeCount,
          activeUsers,
          activeRepositories,
        },
        database: {
          name: mongoose.connection.name,
          size: dbStats["dataSize"],
          storageSize: dbStats["storageSize"],
          indexes: dbStats["indexes"],
          indexSize: dbStats["indexSize"],
        },
      };
    } catch (error) {
      logger.error("Failed to get database statistics:", error);
      throw error;
    }
  }
}
