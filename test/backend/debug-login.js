import dotenv from "dotenv";
dotenv.config();

import { connectDatabase } from "../config/database";
import { User } from "../models/user-model";
import bcrypt from "bcryptjs";

async function debugLogin() {
  try {
    await connectDatabase();

    // Find user by email
    const user = await User.findOne({
      email: "test@example.com",
      isActive: true,
    }).select("+password");

    console.log("User found:", !!user);
    if (user) {
      console.log("User email:", user.email);
      console.log("User isActive:", user.isActive);
      console.log("Password hash exists:", !!user.password);
      console.log("Password hash length:", user.password?.length);

      // Test password comparison
      const testPassword = "TestPassword123!";
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log("Password match:", isMatch);

      // Test user method
      const isMatchMethod = await user.comparePassword(testPassword);
      console.log("Password match (method):", isMatchMethod);
    }
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    process.exit(0);
  }
}

debugLogin();
