"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import apiClient from "@/lib/api";

export default function TestPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    try {
      console.log("Testing backend connection...");
      console.log("API Base URL:", process.env.NEXT_PUBLIC_API_URL);

      // Test registration
      const response = await apiClient.post("/auth/register", {
        firstName: "Frontend",
        lastName: "Test",
        email: `frontend.test.${Date.now()}@example.com`,
        password: "TestPassword123!",
      });

      setResult(
        `SUCCESS: Registration worked!\nResponse: ${JSON.stringify(response.data, null, 2)}`
      );
    } catch (error: any) {
      console.error("Backend test error:", error);
      setResult(
        `ERROR: ${error.message}\nResponse: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : "No response data"}\nStatus: ${error.response?.status || "Unknown"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      // Test login with known working credentials
      const response = await apiClient.post("/auth/login", {
        email: "john.doe@example.com",
        password: "SimplePass123!",
      });

      setResult(
        `LOGIN SUCCESS:\nResponse: ${JSON.stringify(response.data, null, 2)}`
      );
    } catch (error: any) {
      console.error("Login test error:", error);
      setResult(
        `LOGIN ERROR: ${error.message}\nResponse: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : "No response data"}\nStatus: ${error.response?.status || "Unknown"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-6">Backend Connection Test</h1>

          <div className="space-y-4 mb-6">
            <Button
              onClick={testBackendConnection}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Registration"}
            </Button>

            <Button
              onClick={testLogin}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? "Testing..." : "Test Login"}
            </Button>
          </div>

          {result && (
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>API Base URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:1021/api"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
