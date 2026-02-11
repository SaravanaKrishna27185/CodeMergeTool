const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/codemergetool", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the schema
const PipelineSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  githubRepoUrl: { type: String },
  githubAccessToken: { type: String },
  gitlabRepoUrl: { type: String },
  gitlabAccessToken: { type: String },
  gitlabBranchName: { type: String },
  gitlabBaseBranch: { type: String },
  sourcePath: { type: String },
  destinationPath: { type: String },
  files: { type: String },
  mergeRequestSourceBranch: { type: String },
  mergeRequestTargetBranch: { type: String },
  mergeRequestTitle: { type: String },
  mergeRequestDescription: { type: String },
});

const PipelineSettings = mongoose.model(
  "PipelineSettings",
  PipelineSettingsSchema
);

async function testSettings() {
  try {
    const testUserId = "test-user-123";

    // Test creating settings
    console.log("Creating test settings...");
    const testSettings = new PipelineSettings({
      userId: testUserId,
      githubRepoUrl: "https://github.com/test/repo",
      githubAccessToken: "test-token",
      gitlabRepoUrl: "https://gitlab.com/test/repo",
      gitlabAccessToken: "gitlab-token",
      gitlabBranchName: "feature-branch",
      gitlabBaseBranch: "main",
      sourcePath: "/src",
      destinationPath: "/dest",
      files: "file1.js,file2.js",
      mergeRequestSourceBranch: "feature-branch",
      mergeRequestTargetBranch: "main",
      mergeRequestTitle: "Test MR",
      mergeRequestDescription: "Test description",
    });

    await testSettings.save();
    console.log("Settings saved successfully!");

    // Test retrieving settings
    console.log("Retrieving settings...");
    const retrieved = await PipelineSettings.findOne({ userId: testUserId });
    console.log("Retrieved settings:", retrieved);

    // Clean up
    await PipelineSettings.deleteOne({ userId: testUserId });
    console.log("Test cleanup completed");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

testSettings();
