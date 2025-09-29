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
import {
  createSession,
  createSessionCookie,
  createUser,
} from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { createBunRequest } from "../../test-utils/bun-request";
import { cleanupTestData, randomEmail } from "../../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

// Mock the API keys service
const mockCreateApiKey = mock(() => ({
  id: "key-123",
  business_id: "business-123",
  name: "Test Key",
  token: "ck_default_token",
  created_at: new Date(),
}));

const mockDeleteApiKey = mock(() => true);

const mockGetApiKeysByBusiness = mock(() => [
  {
    id: "key-123",
    business_id: "business-123",
    name: "Test Key",
    last_used_at: null,
    created_at: new Date(),
  },
]);

const mockRotateApiKey = mock(() => ({
  id: "new-key-456",
  name: "Test Key",
  token: "ck_newtoken789",
  business_id: "business-123",
  created_at: new Date(),
}));

mock.module("../../services/api-keys", () => ({
  createApiKey: mockCreateApiKey,
  deleteApiKey: mockDeleteApiKey,
  getApiKeysByBusiness: mockGetApiKeysByBusiness,
  rotateApiKey: mockRotateApiKey,
}));

import { settings } from "./settings";

describe("Settings Controller", () => {
  beforeEach(async () => {
    await cleanupTestData(connection);
  });

  afterEach(() => {
    mockGetApiKeysByBusiness.mockClear();
    mockCreateApiKey.mockClear();
    mockDeleteApiKey.mockClear();
    mockRotateApiKey.mockClear();
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  const createTestSession = async () => {
    const user = await createUser(randomEmail(), "Test Business");
    const sessionId = await createSession(user.id);
    return [sessionId, user.business_id] as const;
  };

  describe("GET /settings/api-keys", () => {
    test("renders API keys page for authenticated user", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      mockGetApiKeysByBusiness.mockReturnValue([
        {
          id: "key-123",
          business_id: businessId,
          name: "Test Key",
          last_used_at: null,
          created_at: new Date(),
        },
      ]);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockGetApiKeysByBusiness).toHaveBeenCalledWith(businessId);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("API Keys - Settings");
      expect(html).toContain("API Keys");
      expect(html).toContain("Test Key");
      expect(html).toContain("ck_••••••••••••••••••••••••••••••••••••••••••••");
      expect(html).toContain("list bg-neutral");
      expect(html).toContain("btn btn-sm");
    });

    test("redirects unauthenticated users", async () => {
      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
      );
      const response = await settings.apiKeys(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    test("renders empty state when no API keys exist", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("No API keys yet");
      expect(html).toContain("Create your first API key");
    });
  });

  describe("POST /settings/api-keys - Create Key", () => {
    test("creates new API key successfully", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockCreateApiKey.mockReturnValue({
        id: "new-key-123",
        name: "Production API",
        business_id: businessId,
        token: "ck_abcdef123456789",
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Production API");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).toHaveBeenCalledWith(
        businessId,
        "Production API",
      );
      expect(html).toContain("API Key Created Successfully");
      expect(html).toContain("ck_abcdef123456789");
      expect(html).toContain("Production API");
      expect(html).toContain("alert alert-success");
    });

    test("rejects creation with empty name", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "   "); // whitespace only
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).not.toHaveBeenCalled();
      expect(html).toContain("Name is required");
      expect(html).toContain("alert alert-error");
    });

    test("rejects creation with invalid CSRF token", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("_csrf", "invalid-token");

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).not.toHaveBeenCalled();
      expect(html).toContain("Invalid security token");
      expect(html).toContain("alert alert-error");
    });
  });

  describe("POST /settings/api-keys - Rotate Key", () => {
    test("rotates API key successfully", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockRotateApiKey.mockReturnValue({
        id: "new-key-456",
        name: "Test Key",
        token: "ck_newtoken789",
        business_id: businessId,
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "rotate");
      formData.append("id", "key-123");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockRotateApiKey).toHaveBeenCalledWith("key-123", businessId);
      expect(html).toContain("API Key Rotated Successfully");
      expect(html).toContain("ck_newtoken789");
      expect(html).toContain("alert alert-info");
    });

    test("handles rotation of non-existent key", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockRotateApiKey.mockImplementationOnce(() => null as any);
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "rotate");
      formData.append("id", "non-existent-key");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found or cannot be rotated");
      expect(html).toContain("alert alert-error");
    });
  });

  describe("POST /settings/api-keys - Revoke Key", () => {
    test("revokes API key successfully", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      const testApiKey = {
        id: "key-123",
        business_id: businessId,
        name: "Test Key",
        last_used_at: null,
        created_at: new Date(),
      };
      mockGetApiKeysByBusiness.mockReturnValue([testApiKey]);
      mockDeleteApiKey.mockReturnValue(true);

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "key-123");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockDeleteApiKey).toHaveBeenCalledWith("key-123", businessId);
      expect(html).toContain("Test Key");
      expect(html).toContain("has been revoked successfully");
      expect(html).toContain("alert alert-warning");
    });

    test("handles revocation of non-existent key", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "non-existent-key");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found");
      expect(html).toContain("alert alert-error");
    });

    test("handles failed deletion", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      const testApiKey = {
        id: "key-123",
        business_id: businessId,
        name: "Test Key",
        last_used_at: null,
        created_at: new Date(),
      };
      mockGetApiKeysByBusiness.mockReturnValue([testApiKey]);
      mockDeleteApiKey.mockReturnValue(false);

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "key-123");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found or already revoked");
      expect(html).toContain("alert alert-error");
    });
  });

  describe("POST /settings/api-keys - Security", () => {
    test("redirects requests without session", async () => {
      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("_csrf", "csrf-token-123");

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    test("rejects requests without CSRF token", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Invalid request");
      expect(html).toContain("alert alert-error");
    });

    test("rejects unknown actions", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "unknown");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Invalid action");
      expect(html).toContain("alert alert-error");
    });
  });

  describe("Business Isolation", () => {
    test("only fetches API keys for the authenticated business", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const testApiKey = {
        id: "key-123",
        business_id: businessId,
        name: "Test Key",
        last_used_at: null,
        created_at: new Date(),
      };
      mockGetApiKeysByBusiness.mockReturnValue([testApiKey]);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      await settings.apiKeys(request);

      expect(mockGetApiKeysByBusiness).toHaveBeenCalledWith(businessId);
    });

    test("scopes all mutations by business ID", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/api-keys",
      );

      mockCreateApiKey.mockReturnValue({
        id: "new-key-123",
        name: "Test Key",
        business_id: businessId,
        token: "ck_token123",
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/api-keys",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      await settings.apiKeys(request);

      expect(mockCreateApiKey).toHaveBeenCalledWith(businessId, "Test Key");
    });
  });
});
