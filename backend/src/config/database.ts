import mongoose from "mongoose";
import { config } from "./config";
import { logger } from "./logger";
import { DatabaseService } from "../services/database-service";

/**
 * Connect to MongoDB database with full initialization
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await DatabaseService.initialize();
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await DatabaseService.disconnect();
  } catch (error) {
    logger.error("❌ Database disconnection failed:", error);
    throw error;
  }
};

/**
 * Get database health status
 */
export const getDatabaseHealth = async () => {
  return await DatabaseService.healthCheck();
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  return await DatabaseService.getStatistics();
};

/**
 * Seed database with initial data (development only)
 */
export const seedDatabase = async (): Promise<void> => {
  if (config.NODE_ENV !== "development") {
    logger.warn("Database seeding is only available in development mode");
    return;
  }

  try {
    await DatabaseService.seedDatabase();
  } catch (error) {
    logger.error("❌ Database seeding failed:", error);
    throw error;
  }
};

/**
 * Clear all data from test database
 * WARNING: Only use in test environment
 */
export const clearTestDatabase = async (): Promise<void> => {
  if (config.NODE_ENV !== "test") {
    throw new Error("clearTestDatabase can only be used in test environment");
  }

  try {
    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      await Promise.all(
        collections.map((collection) => collection.deleteMany({}))
      );
    }
    console.log("🧹 Test database cleared");
  } catch (error) {
    console.error("❌ Failed to clear test database:", error);
    throw error;
  }
};

export default mongoose;
