const axios = require("axios");

async function testPipelineAutomation() {
  console.log("🧪 Testing Pipeline Automation API...");

  const baseURL = "http://localhost:1021";

  // First, test if the server is running
  try {
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log("✅ Backend server is running:", healthResponse.data);
  } catch (error) {
    console.error("❌ Backend server is not responding:", error.message);
    return;
  }

  // Test authentication endpoint
  try {
    const authResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: "test@example.com",
      password: "TestPassword123!",
    });

    const token = authResponse.data.token;
    console.log("✅ Authentication successful, got token");

    // Test pipeline automation endpoint
    const pipelinePayload = {
      githubRepoUrl: "https://github.com/octocat/Hello-World.git",
      githubAccessToken: "test-token",
      githubDownloadLocation: "C:\\temp\\test-github",
      gitlabRepoUrl: "https://gitlab.com/test/test-repo.git",
      gitlabAccessToken: "test-gitlab-token",
      gitlabBranchName: "test-branch",
      gitlabBaseBranch: "main",
      gitlabCheckoutLocation: "C:\\temp\\test-gitlab",
      sourcePath: "src",
      destinationPath: "dest",
      files: ["test.js", "README.md"],
      copyMode: "files",
      includeFolders: [],
      excludePatterns: ["node_modules", ".git"],
      preserveFolderStructure: true,
      mergeRequest: {
        sourceBranch: "test-branch",
        targetBranch: "main",
        title: "Test Pipeline Automation",
        description:
          "This is a test merge request created by pipeline automation",
        commitMessage: "Test: Automated file copy and merge request creation",
        changesDescription: "Testing the pipeline automation functionality",
      },
      enabledSteps: {
        "clone-github": true,
        "create-gitlab-branch": true,
        "copy-files": true,
        "commit-changes": true,
        "create-merge-request": true,
      },
    };

    console.log("🚀 Testing pipeline automation API call...");
    const pipelineResponse = await axios.post(
      `${baseURL}/api/pipeline/automate`,
      pipelinePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Pipeline automation API responded:", pipelineResponse.data);

    const { pipelineRunId } = pipelineResponse.data;

    if (pipelineRunId) {
      console.log("🎯 Got pipeline run ID:", pipelineRunId);

      // Test polling the pipeline status
      setTimeout(async () => {
        try {
          const statusResponse = await axios.get(
            `${baseURL}/api/pipeline-stats/runs/${pipelineRunId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("📊 Pipeline status:", {
            status: statusResponse.data.data.status,
            steps: statusResponse.data.data.steps.map((s) => ({
              name: s.stepName,
              status: s.status,
              message: s.message,
            })),
          });
        } catch (error) {
          console.error(
            "❌ Error checking pipeline status:",
            error.response?.data || error.message
          );
        }
      }, 3000);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ API Error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("❌ Request Error:", error.message);
    }
  }
}

// Run the test
testPipelineAutomation();
