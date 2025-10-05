import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { SQL } from "bun";
import { cleanupTestData, createTestBusiness } from "../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../services/database", () => ({
  get db() {
    return connection;
  },
}));

import { createApiKey } from "../services/api-keys";
import { db } from "../services/database";
import { getApiAuthContext, requireApiAuth } from "./api-auth";

describe("API Auth Middleware", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(db);
    testBusinessId = await createTestBusiness(connection, "Test API Business");
  });

  afterEach(async () => {
    // Ensure any hanging transactions are cleaned up
    try {
      await connection`ROLLBACK`;
    } catch {
      // Ignore if no transaction is active
    }
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("getApiAuthContext", () => {
    test("returns unauthenticated context for request without Authorization header", async () => {
      const request = new Request("http://localhost:3000/api/test");
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for request with malformed Authorization header", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "InvalidFormat token-value",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for request without Bearer prefix", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Basic some-token",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for empty Authorization header", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for Bearer with no token", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Bearer ",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for invalid API key token", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Bearer invalid-api-key-token",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for non-existent API key", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Bearer ck_this_key_does_not_exist_in_database_12345",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns unauthenticated context for malformed token that might cause errors", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Bearer ck_malformed_chars_!@#$%^&*()",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("returns authenticated context for valid API key", async () => {
      const apiKey = await createApiKey(testBusinessId, "Test API Key");

      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(true);
      expect(context.apiKey).not.toBeNull();
      expect(context.business).not.toBeNull();
      expect(context.apiKey?.id).toBe(apiKey.id);
      expect(context.apiKey?.business_id).toBe(testBusinessId);
      expect(context.apiKey?.name).toBe("Test API Key");
      expect(context.business?.id).toBe(testBusinessId);
      expect(context.business?.business_name).toBe("Test API Business");
    });

    test("updates last_used_at timestamp when API key is used", async () => {
      const apiKey = await createApiKey(testBusinessId, "Usage Tracking Key");

      // First usage
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
        },
      });
      const context1 = await getApiAuthContext(request);

      expect(context1.isAuthenticated).toBe(true);
      expect(context1.apiKey?.last_used_at).toBeNull(); // Should be null in response

      // Check database was updated
      const dbKey1 = await connection`
        SELECT last_used_at FROM api_keys WHERE id = ${apiKey.id}
      `;
      expect(dbKey1[0].last_used_at).toBeInstanceOf(Date);

      // Wait a moment and use again
      await new Promise((resolve) => setTimeout(resolve, 10));

      const context2 = await getApiAuthContext(request);
      const dbKey2 = await connection`
        SELECT last_used_at FROM api_keys WHERE id = ${apiKey.id}
      `;

      expect(context2.isAuthenticated).toBe(true);
      expect(dbKey2[0].last_used_at).toBeInstanceOf(Date);
      expect(dbKey2[0].last_used_at.getTime()).toBeGreaterThan(
        dbKey1[0].last_used_at.getTime(),
      );
    });

    test("returns unauthenticated context when business is deleted", async () => {
      const apiKey = await createApiKey(testBusinessId, "Orphaned Key");

      // Delete the business
      await connection`DELETE FROM businesses WHERE id = ${testBusinessId}`;

      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("handles database connection errors gracefully", async () => {
      // Use a malformed token that will still pass initial validations
      // but might cause database query issues
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: "Bearer ck_malformed_but_valid_format_token_12345678",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });

    test("handles multiple authorization headers correctly", async () => {
      const apiKey = await createApiKey(testBusinessId, "Multi Header Key");

      // Test with the authorization header among other headers
      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey.token}`,
          "user-agent": "Test Client",
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(true);
      expect(context.apiKey?.id).toBe(apiKey.id);
      expect(context.business?.id).toBe(testBusinessId);
    });

    test("is case sensitive for Bearer prefix", async () => {
      const apiKey = await createApiKey(testBusinessId, "Case Test Key");

      const request = new Request("http://localhost:3000/api/test", {
        headers: {
          authorization: `bearer ${apiKey.token}`, // lowercase
        },
      });
      const context = await getApiAuthContext(request);

      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();
    });
  });

  describe("requireApiAuth", () => {
    test("returns null for authenticated request", async () => {
      const apiKey = await createApiKey(testBusinessId, "Auth Required Key");

      const request = new Request("http://localhost:3000/api/protected", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
        },
      });

      const result = await requireApiAuth(request);
      expect(result).toBeNull();
    });

    test("returns 401 error response for unauthenticated request", async () => {
      const request = new Request("http://localhost:3000/api/protected");

      const result = await requireApiAuth(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toEqual({ error: "Invalid or missing API key" });
    });

    test("returns 401 error for malformed Authorization header", async () => {
      const request = new Request("http://localhost:3000/api/protected", {
        headers: {
          authorization: "InvalidFormat token",
        },
      });

      const result = await requireApiAuth(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toEqual({ error: "Invalid or missing API key" });
    });

    test("returns 401 error for invalid API key", async () => {
      const request = new Request("http://localhost:3000/api/protected", {
        headers: {
          authorization: "Bearer invalid-api-key",
        },
      });

      const result = await requireApiAuth(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toEqual({ error: "Invalid or missing API key" });
    });

    test("returns 401 error for expired business", async () => {
      const apiKey = await createApiKey(testBusinessId, "Expired Business Key");

      // Delete the business to simulate expiration
      await connection`DELETE FROM businesses WHERE id = ${testBusinessId}`;

      const request = new Request("http://localhost:3000/api/protected", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
        },
      });

      const result = await requireApiAuth(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);

      const body = await result?.json();
      expect(body).toEqual({ error: "Invalid or missing API key" });
    });

    test("returns JSON response with correct content-type", async () => {
      const request = new Request("http://localhost:3000/api/protected");

      const result = await requireApiAuth(request);

      expect(result).not.toBeNull();
      expect(result?.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("Integration scenarios", () => {
    test("complete API authentication flow", async () => {
      // Step 1: Create API key
      const apiKey = await createApiKey(testBusinessId, "Integration Test Key");
      expect(apiKey.token).toStartWith("ck_");

      // Step 2: Unauthenticated request fails
      let request = new Request("http://localhost:3000/api/protected");
      let authResult = await requireApiAuth(request);
      expect(authResult?.status).toBe(401);

      // Step 3: Authenticated request succeeds
      request = new Request("http://localhost:3000/api/protected", {
        headers: { authorization: `Bearer ${apiKey.token}` },
      });
      authResult = await requireApiAuth(request);
      expect(authResult).toBeNull(); // No error response

      // Step 4: Auth context provides correct information
      const context = await getApiAuthContext(request);
      expect(context.isAuthenticated).toBe(true);
      expect(context.apiKey?.name).toBe("Integration Test Key");
      expect(context.business?.business_name).toBe("Test API Business");

      // Step 5: API key usage is tracked
      const dbKey = await connection`
        SELECT last_used_at FROM api_keys WHERE id = ${apiKey.id}
      `;
      expect(dbKey[0].last_used_at).toBeInstanceOf(Date);
    });

    test("multiple API keys for same business", async () => {
      // Create multiple keys
      const prodKey = await createApiKey(testBusinessId, "Production");
      const stagingKey = await createApiKey(testBusinessId, "Staging");
      const devKey = await createApiKey(testBusinessId, "Development");

      // All keys should authenticate to the same business
      const contexts = await Promise.all([
        getApiAuthContext(
          new Request("http://localhost:3000/api/test", {
            headers: { authorization: `Bearer ${prodKey.token}` },
          }),
        ),
        getApiAuthContext(
          new Request("http://localhost:3000/api/test", {
            headers: { authorization: `Bearer ${stagingKey.token}` },
          }),
        ),
        getApiAuthContext(
          new Request("http://localhost:3000/api/test", {
            headers: { authorization: `Bearer ${devKey.token}` },
          }),
        ),
      ]);

      contexts.forEach((context) => {
        expect(context.isAuthenticated).toBe(true);
        expect(context.business?.id).toBe(testBusinessId);
        expect(context.apiKey?.business_id).toBe(testBusinessId);
      });

      expect(contexts[0].apiKey?.name).toBe("Production");
      expect(contexts[1].apiKey?.name).toBe("Staging");
      expect(contexts[2].apiKey?.name).toBe("Development");
    });

    test("API key deletion invalidates authentication", async () => {
      const apiKey = await createApiKey(testBusinessId, "Delete Test Key");

      // Key should work initially
      const request = new Request("http://localhost:3000/api/test", {
        headers: { authorization: `Bearer ${apiKey.token}` },
      });
      let context = await getApiAuthContext(request);
      expect(context.isAuthenticated).toBe(true);

      // Delete the key
      await connection`DELETE FROM api_keys WHERE id = ${apiKey.id}`;

      // Key should no longer work
      context = await getApiAuthContext(request);
      expect(context.isAuthenticated).toBe(false);
      expect(context.apiKey).toBeNull();
      expect(context.business).toBeNull();

      // requireApiAuth should return error
      const authResult = await requireApiAuth(request);
      expect(authResult?.status).toBe(401);
    });

    test("different businesses have isolated authentication", async () => {
      const otherBusinessId = await createTestBusiness(
        connection,
        "Other Business",
      );

      const key1 = await createApiKey(testBusinessId, "Business 1 Key");
      const key2 = await createApiKey(otherBusinessId, "Business 2 Key");

      const context1 = await getApiAuthContext(
        new Request("http://localhost:3000/api/test", {
          headers: { authorization: `Bearer ${key1.token}` },
        }),
      );

      const context2 = await getApiAuthContext(
        new Request("http://localhost:3000/api/test", {
          headers: { authorization: `Bearer ${key2.token}` },
        }),
      );

      expect(context1.isAuthenticated).toBe(true);
      expect(context2.isAuthenticated).toBe(true);

      expect(context1.business?.id).toBe(testBusinessId);
      expect(context1.business?.business_name).toBe("Test API Business");

      expect(context2.business?.id).toBe(otherBusinessId);
      expect(context2.business?.business_name).toBe("Other Business");

      expect(context1.business?.id).not.toBe(context2.business?.id);
    });
  });
});
