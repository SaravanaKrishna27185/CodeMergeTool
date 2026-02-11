// Test GitLab connection from backend
const GitLabService = require("./dist/services/gitlab-service").default;

async function testGitLab() {
  console.log("=== GitLab Connection Test ===");

  // Test URLs - replace with your actual values
  const testCases = [
    {
      name: "Current URL (likely incorrect)",
      url: "https://radcab",
      token: "your-token-here", // Replace with actual token
    },
    {
      name: "Full repository URL format",
      url: "https://radcab/intelligent-document-processing/idp-solution",
      token: "your-token-here", // Replace with actual token
    },
    {
      name: "Alternative format",
      url: "https://radcab.com/intelligent-document-processing/idp-solution",
      token: "your-token-here", // Replace with actual token
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`URL: ${testCase.url}`);

    try {
      // Test URL parsing
      const parsedUrl = new URL(testCase.url);
      console.log(`✓ URL parsing successful:`);
      console.log(`  Protocol: ${parsedUrl.protocol}`);
      console.log(`  Host: ${parsedUrl.host}`);
      console.log(`  Pathname: ${parsedUrl.pathname}`);

      // Test GitLab service creation
      if (testCase.token !== "your-token-here") {
        const gitlabService = new GitLabService(testCase.url, testCase.token);
        console.log(`✓ GitLab service created successfully`);

        // Test connection
        try {
          await gitlabService.testConnection();
          console.log(`✓ GitLab connection successful`);
        } catch (connError) {
          console.log(`✗ GitLab connection failed: ${connError.message}`);
        }
      } else {
        console.log(
          `⚠ Skipping connection test - please provide actual token`
        );
      }
    } catch (error) {
      console.log(`✗ Test failed: ${error.message}`);
    }
  }

  console.log("\n=== Test Complete ===");
  console.log("\nCommon GitLab URL formats:");
  console.log("- https://gitlab.com/namespace/project");
  console.log("- https://your-gitlab-instance.com/namespace/project");
  console.log("- https://your-domain.com/gitlab/namespace/project");

  console.log("\nBased on your error, try these potential fixes:");
  console.log(
    '1. Check if "radcab" is a complete domain (should be radcab.com or similar)'
  );
  console.log(
    "2. Verify if there's a port number needed (e.g., https://radcab:8080)"
  );
  console.log(
    "3. Check if GitLab is hosted at a subpath (e.g., https://radcab.com/gitlab)"
  );
  console.log("4. Ensure your GitLab instance is accessible from this network");
}

// Run the test
testGitLab().catch(console.error);
