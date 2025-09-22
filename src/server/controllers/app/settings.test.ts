import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { createMockRequest } from "../../test-utils/setup";

// Mock the API keys service
const mockCreateApiKey = mock();
const mockDeleteApiKey = mock();
const mockGetApiKeysByBusiness = mock();
const mockRotateApiKey = mock();
mock.module("../../services/api-keys", () => ({
  createApiKey: mockCreateApiKey,
  deleteApiKey: mockDeleteApiKey,
  getApiKeysByBusiness: mockGetApiKeysByBusiness,
  rotateApiKey: mockRotateApiKey,
}));

// Mock the auth middleware
const mockGetAuthContext = mock();
const mockRequireAuth = mock();
mock.module("../../middleware/auth", () => ({
  getAuthContext: mockGetAuthContext,
  requireAuth: mockRequireAuth,
}));

// Mock auth service
const mockGetSessionIdFromCookies = mock();
mock.module("../../services/auth", () => ({
  getSessionIdFromCookies: mockGetSessionIdFromCookies,
}));

// Mock CSRF service
const mockCreateCsrfToken = mock();
const mockVerifyCsrfToken = mock();
mock.module("../../services/csrf", () => ({
  createCsrfToken: mockCreateCsrfToken,
  verifyCsrfToken: mockVerifyCsrfToken,
}));

import { settings } from "./settings";

const mockBusiness = {
  id: "business-123",
  name: "Test Business",
  created_at: new Date(),
};

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  business_id: "business-123",
  created_at: new Date(),
};

const mockAuthContext = {
  user: mockUser,
  business: mockBusiness,
  isAuthenticated: true,
};

const mockApiKey = {
  id: "key-123",
  business_id: "business-123",
  name: "Test Key",
  last_used_at: null,
  created_at: new Date(),
};

describe("Settings Controller", () => {
  afterEach(() => {
    // Clear all mock call histories after each test
    mockRequireAuth.mockClear();
    mockGetAuthContext.mockClear();
    mockGetApiKeysByBusiness.mockClear();
    mockGetSessionIdFromCookies.mockClear();
    mockCreateCsrfToken.mockClear();
    mockVerifyCsrfToken.mockClear();
    mockCreateApiKey.mockClear();
    mockDeleteApiKey.mockClear();
    mockRotateApiKey.mockClear();
  });

  describe("GET /settings/api-keys", () => {
    test("renders API keys page for authenticated user", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([mockApiKey]);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const request = createMockRequest(
        "http://localhost:3000/settings/api-keys",
        "GET",
      );
      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockRequireAuth).toHaveBeenCalledWith(request);
      expect(mockGetAuthContext).toHaveBeenCalledWith(request);
      expect(mockGetApiKeysByBusiness).toHaveBeenCalledWith("business-123");
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("API Keys - Settings");
      expect(html).toContain("Test Key");
      expect(html).toContain("ck_••••••••••••••••••••••••••••••••••••••••••••");
    });

    test("redirects unauthenticated users", async () => {
      const redirectResponse = new Response("", {
        status: 303,
        headers: { Location: "/login" },
      });
      mockRequireAuth.mockReturnValue(redirectResponse);

      const request = createMockRequest(
        "http://localhost:3000/settings/api-keys",
        "GET",
      );
      const response = await settings.apiKeys(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    test("returns 404 when business not found", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue({
        user: mockUser,
        business: null,
        isAuthenticated: true,
      });

      const request = createMockRequest(
        "http://localhost:3000/settings/api-keys",
        "GET",
      );
      const response = await settings.apiKeys(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Business not found");
    });

    test("renders empty state when no API keys exist", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const request = createMockRequest(
        "http://localhost:3000/settings/api-keys",
        "GET",
      );
      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("No API keys yet");
      expect(html).toContain("Create your first API key");
    });
  });

  describe("POST /settings/api-keys - Create Key", () => {
    test("creates new API key successfully", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockCreateApiKey.mockReturnValue({
        id: "new-key-123",
        name: "Production API",
        token: "ck_abcdef123456789",
        business_id: "business-123",
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Production API");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).toHaveBeenCalledWith(
        "business-123",
        "Production API",
      );
      expect(mockVerifyCsrfToken).toHaveBeenCalledWith(
        "session-123",
        "POST",
        "/settings/api-keys",
        "csrf-token-123",
      );
      expect(html).toContain("API Key Created Successfully");
      expect(html).toContain("ck_abcdef123456789");
      expect(html).toContain("Production API");
    });

    test("rejects creation with empty name", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "   "); // whitespace only
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).not.toHaveBeenCalled();
      expect(html).toContain("Name is required");
    });

    test("rejects creation with invalid CSRF token", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(false);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("csrf_token", "invalid-token");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockCreateApiKey).not.toHaveBeenCalled();
      expect(html).toContain("Invalid security token");
    });
  });

  describe("POST /settings/api-keys - Rotate Key", () => {
    test("rotates API key successfully", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockRotateApiKey.mockReturnValue({
        id: "new-key-456",
        name: "Test Key",
        token: "ck_newtoken789",
        business_id: "business-123",
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "rotate");
      formData.append("id", "key-123");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockRotateApiKey).toHaveBeenCalledWith("key-123", "business-123");
      expect(html).toContain("API Key Rotated Successfully");
      expect(html).toContain("ck_newtoken789");
    });

    test("handles rotation of non-existent key", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockRotateApiKey.mockReturnValue(null);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "rotate");
      formData.append("id", "non-existent-key");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found or cannot be rotated");
    });
  });

  describe("POST /settings/api-keys - Revoke Key", () => {
    test("revokes API key successfully", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockGetApiKeysByBusiness.mockReturnValue([mockApiKey]);
      mockDeleteApiKey.mockReturnValue(true);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "key-123");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(mockDeleteApiKey).toHaveBeenCalledWith("key-123", "business-123");
      expect(html).toContain("Test Key");
      expect(html).toContain("has been revoked successfully");
    });

    test("handles revocation of non-existent key", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "non-existent-key");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found");
    });

    test("handles failed deletion", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockGetApiKeysByBusiness.mockReturnValue([mockApiKey]);
      mockDeleteApiKey.mockReturnValue(false);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("id", "key-123");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Key not found or already revoked");
    });
  });

  describe("POST /settings/api-keys - Security", () => {
    test("rejects requests without session", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetSessionIdFromCookies.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Invalid request");
    });

    test("rejects requests without CSRF token", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Invalid request");
    });

    test("rejects unknown actions", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "unknown");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      const response = await settings.apiKeys(request);
      const html = await response.text();

      expect(html).toContain("Invalid action");
    });
  });

  describe("Business Isolation", () => {
    test("only fetches API keys for the authenticated business", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetApiKeysByBusiness.mockReturnValue([mockApiKey]);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const request = createMockRequest(
        "http://localhost:3000/settings/api-keys",
        "GET",
      );
      await settings.apiKeys(request);

      expect(mockGetApiKeysByBusiness).toHaveBeenCalledWith("business-123");
    });

    test("scopes all mutations by business ID", async () => {
      mockRequireAuth.mockReturnValue(null);
      mockGetAuthContext.mockReturnValue(mockAuthContext);
      mockGetSessionIdFromCookies.mockReturnValue("session-123");
      mockVerifyCsrfToken.mockReturnValue(true);
      mockCreateApiKey.mockReturnValue({
        id: "new-key-123",
        name: "Test Key",
        token: "ck_token123",
        business_id: "business-123",
        created_at: new Date(),
      });
      mockGetApiKeysByBusiness.mockReturnValue([]);
      mockCreateCsrfToken.mockReturnValue("csrf-token-123");

      const formData = new FormData();
      formData.append("action", "create");
      formData.append("name", "Test Key");
      formData.append("csrf_token", "csrf-token-123");

      const request = new Request("http://localhost:3000/settings/api-keys", {
        method: "POST",
        body: formData,
        headers: {
          cookie: "session_id=session-123",
        },
      });

      await settings.apiKeys(request);

      expect(mockCreateApiKey).toHaveBeenCalledWith("business-123", "Test Key");
    });
  });

  afterAll(() => {
    mock.restore();
  });
});
