const fetch = require("node-fetch");

async function testAuth() {
  console.log("Testing authentication endpoints...");

  try {
    // Test registration
    console.log("\n1. Testing registration...");
    const registerResponse = await fetch(
      "http://localhost:1021/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "TestPassword123!",
        }),
      }
    );

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log("Registration successful:", registerData);

      // Test login with the registered user
      console.log("\n2. Testing login...");
      const loginResponse = await fetch(
        "http://localhost:1021/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "TestPassword123!",
          }),
        }
      );

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log("Login successful:", loginData);
      } else {
        const loginError = await loginResponse.text();
        console.log("Login failed:", loginResponse.status, loginError);
      }
    } else {
      const registerError = await registerResponse.text();
      console.log(
        "Registration failed:",
        registerResponse.status,
        registerError
      );

      // If registration failed (user might already exist), try login directly
      console.log("\n2. Testing login with existing user...");
      const loginResponse = await fetch("1/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "TestPassword123!",
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log("Login successful:", loginData);
      } else {
        const loginError = await loginResponse.text();
        console.log("Login failed:", loginResponse.status, loginError);
      }
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testAuth();
