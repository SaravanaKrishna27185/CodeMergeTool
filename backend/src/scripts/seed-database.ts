#!/usr/bin/env node

/**
 * Database seeding utility script
 * Usage: npm run seed
 */

import {
  connectDatabase,
  seedDatabase,
  disconnectDatabase,
} from "../config/database";
import { logger } from "../config/logger";
import { config } from "../config/config";

async function runSeeding() {
  try {
    logger.info("🌱 Starting database seeding process...");

    // Ensure we're in development mode
    if (config.NODE_ENV !== "development") {
      logger.error("❌ Database seeding is only allowed in development mode");
      process.exit(1);
    }

    // Connect to database
    await connectDatabase();
    logger.info("✅ Connected to database");

    // Run seeding
    await seedDatabase();
    logger.info("✅ Database seeding completed successfully");

    // Disconnect
    await disconnectDatabase();
    logger.info("✅ Disconnected from database");

    process.exit(0);
  } catch (error) {
    logger.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  runSeeding();
}
