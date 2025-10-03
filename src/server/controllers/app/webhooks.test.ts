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
import {
  clearWebhookQueue,
  mockWebhookEndpoint,
} from "../../test-utils/webhooks";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

// Mock the webhook service
const mockUpdateWebhookSettings = mock();
const mockGetWebhookSettings = mock();
const mockSendTestWebhook = mock();
const mockGetRecentWebhookDeliveries = mock();

mock.module("../../services/webhooks", () => ({
  updateWebhookSettings: mockUpdateWebhookSettings,
  getWebhookSettings: mockGetWebhookSettings,
  sendTestWebhook: mockSendTestWebhook,
  getRecentWebhookDeliveries: mockGetRecentWebhookDeliveries,
}));

import { webhooks } from "./webhooks";

describe("Webhook Settings Controller", () => {
  let mockEndpoint: ReturnType<typeof mockWebhookEndpoint>;

  beforeEach(async () => {
    await cleanupTestData(connection);
    await clearWebhookQueue();
    mockEndpoint = mockWebhookEndpoint();
  });

  afterEach(() => {
    mockEndpoint.cleanup();
    mockUpdateWebhookSettings.mockClear();
    mockGetWebhookSettings.mockClear();
    mockSendTestWebhook.mockClear();
    mockGetRecentWebhookDeliveries.mockClear();
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

  describe("GET /settings/webhooks", () => {
    test("renders webhooks settings page for authenticated user", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockGetWebhookSettings).toHaveBeenCalledWith(businessId);
      expect(mockGetRecentWebhookDeliveries).toHaveBeenCalledWith(businessId);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Webhooks - Settings");
      expect(html).toContain("Configure webhook delivery");
      expect(html).toContain("webhook_url");
    });

    test("redirects unauthenticated users", async () => {
      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
      );
      const response = await webhooks.index(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    test("shows existing webhook settings", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue({
        webhook_url: "https://example.com/webhook",
        webhook_secret: "whk_test_secret_123",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      const response = await webhooks.index(request);
      const html = await response.text();

      expect(html).toContain("https://example.com/webhook");
      expect(html).toContain("whk_•••••••••••_123");
    });

    test("shows recent webhook deliveries", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([
        {
          id: "webhook-1",
          survey_id: "test-survey",
          subject_id: "test-user",
          status: "delivered",
          attempts: 1,
          response_status_code: 200,
          created_at: new Date(),
        },
      ]);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      const response = await webhooks.index(request);
      const html = await response.text();

      expect(html).toContain("Recent Webhook Deliveries");
      expect(html).toContain("test-survey");
      expect(html).toContain("delivered");
      expect(html).toContain("200");
    });
  });

  describe("POST /settings/webhooks - update", () => {
    test("updates webhook settings successfully", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockUpdateWebhookSettings.mockReturnValue({
        webhook_url: "https://example.com/webhook",
        webhook_secret: "custom_secret",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");
      formData.append("webhook_secret", "custom_secret");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockUpdateWebhookSettings).toHaveBeenCalledWith(
        businessId,
        "https://example.com/webhook",
        "custom_secret",
      );
      expect(html).toContain("Webhook Settings Updated Successfully");
      expect(html).toContain("https://example.com/webhook");
      expect(html).toContain("custom_secret"); // Full secret should be shown once
      expect(html).toContain("copy this now");
    });

    test("auto-generates secret when not provided", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockUpdateWebhookSettings.mockReturnValue({
        webhook_url: "https://example.com/webhook",
        webhook_secret: "whk_auto_generated_secret_123",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");
      formData.append("webhook_secret", ""); // Empty secret
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockUpdateWebhookSettings).toHaveBeenCalledWith(
        businessId,
        "https://example.com/webhook",
        null,
      );
      expect(html).toContain("Webhook Settings Updated Successfully");
      expect(html).toContain("whk_auto_generated_secret_123");
      expect(html).toContain("copy this now");
    });

    test("validates webhook URL format", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "invalid-url");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockUpdateWebhookSettings).not.toHaveBeenCalled();
      expect(html).toContain("Invalid webhook URL format");
    });

    test("requires webhook URL", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockUpdateWebhookSettings).not.toHaveBeenCalled();
      expect(html).toContain("Webhook URL is required");
    });

    test("rejects invalid CSRF token", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");
      formData.append("_csrf", "invalid-token");

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockUpdateWebhookSettings).not.toHaveBeenCalled();
      expect(html).toContain("Invalid security token");
    });
  });

  describe("POST /settings/webhooks - test", () => {
    test("sends test webhook successfully", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockSendTestWebhook.mockReturnValue({
        success: true,
        statusCode: 200,
        responseBody: "OK",
      });
      mockGetWebhookSettings.mockReturnValue({
        webhook_url: mockEndpoint.url,
        webhook_secret: "test_secret",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "test");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockSendTestWebhook).toHaveBeenCalledWith(businessId);
      expect(html).toContain("Test Webhook Sent Successfully");
      expect(html).toContain("200"); // Status code
    });

    test("handles test webhook failure", async () => {
      const [sessionId, _businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockSendTestWebhook.mockReturnValue({
        success: false,
        statusCode: 0,
        responseBody: "Connection failed",
      });
      mockGetWebhookSettings.mockReturnValue({
        webhook_url: "http://localhost:99999", // Non-existent endpoint
        webhook_secret: "test_secret",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "test");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(html).toContain("Test Webhook Failed");
      expect(html).toContain("Connection failed");
    });

    test("handles sendTestWebhook service errors", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockSendTestWebhook.mockImplementation(() => {
        throw new Error("Webhook not configured");
      });
      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "test");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(mockSendTestWebhook).toHaveBeenCalledWith(businessId);
      expect(html).toContain("Webhook not configured");
    });
  });

  describe("Security", () => {
    test("redirects unauthenticated POST requests", async () => {
      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");
      formData.append("_csrf", "csrf-token-123");

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    test("rejects requests without CSRF token", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(html).toContain("Invalid request");
    });

    test("rejects unknown actions", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "unknown");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      const response = await webhooks.index(request);
      const html = await response.text();

      expect(html).toContain("Invalid action");
    });
  });

  describe("Business Isolation", () => {
    test("only fetches webhook settings for the authenticated business", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      mockGetWebhookSettings.mockReturnValue(null);
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          headers: { Cookie: cookieHeader },
        },
      );
      await webhooks.index(request);

      expect(mockGetWebhookSettings).toHaveBeenCalledWith(businessId);
      expect(mockGetRecentWebhookDeliveries).toHaveBeenCalledWith(businessId);
    });

    test("scopes all mutations by business ID", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/settings/webhooks",
      );

      mockUpdateWebhookSettings.mockReturnValue({
        webhook_url: "https://example.com/webhook",
        webhook_secret: "test_secret",
      });
      mockGetRecentWebhookDeliveries.mockReturnValue([]);

      const formData = new FormData();
      formData.append("action", "update");
      formData.append("webhook_url", "https://example.com/webhook");
      formData.append("webhook_secret", "test_secret");
      formData.append("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/settings/webhooks",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: formData,
        },
      );

      await webhooks.index(request);

      expect(mockUpdateWebhookSettings).toHaveBeenCalledWith(
        businessId,
        "https://example.com/webhook",
        "test_secret",
      );
    });
  });
});
