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
import {
  clearWebhookQueue,
  createTestWebhook,
  getWebhookQueueItems,
  mockWebhookEndpoint,
} from "../test-utils/webhooks";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import {
  calculateNextRetryTime,
  generateWebhookSecret,
  generateWebhookSignature,
  getRecentWebhookDeliveries,
  getWebhookSettings,
  queueWebhookDelivery,
  sendTestWebhook,
  sendWebhook,
  updatePendingWebhookComment,
  updateWebhookSettings,
} from "./webhooks";

describe("Webhook Service", () => {
  let mockEndpoint: ReturnType<typeof mockWebhookEndpoint>;
  let testPort = 10000; // Start from port 10000 and increment

  beforeEach(async () => {
    await cleanupTestData(connection);
    await clearWebhookQueue();
    mockEndpoint = mockWebhookEndpoint(testPort++); // Use different port for each test
  });

  afterEach(async () => {
    mockEndpoint.cleanup();
    await clearWebhookQueue();
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("generateWebhookSecret", () => {
    test("generates secret with whk_ prefix", () => {
      const secret = generateWebhookSecret();
      expect(secret).toStartWith("whk_");
      expect(secret.length).toBeGreaterThan(10);
    });

    test("generates unique secrets", () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe("generateWebhookSignature", () => {
    test("generates consistent signatures", () => {
      const payload = '{"test": "data"}';
      const secret = "test_secret";

      const sig1 = generateWebhookSignature(payload, secret);
      const sig2 = generateWebhookSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA256 hex length
    });

    test("generates different signatures for different payloads", () => {
      const secret = "test_secret";
      const sig1 = generateWebhookSignature('{"test": "data1"}', secret);
      const sig2 = generateWebhookSignature('{"test": "data2"}', secret);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("webhook settings", () => {
    test("updates webhook settings with auto-generated secret", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      const result = await updateWebhookSettings(
        businessId,
        "https://example.com/webhook",
      );

      expect(result.webhook_url).toBe("https://example.com/webhook");
      expect(result.webhook_secret).toStartWith("whk_");
    });

    test("updates webhook settings with provided secret", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");
      const customSecret = "custom_secret_123";

      const result = await updateWebhookSettings(
        businessId,
        "https://example.com/webhook",
        customSecret,
      );

      expect(result.webhook_url).toBe("https://example.com/webhook");
      expect(result.webhook_secret).toBe(customSecret);
    });

    test("clears webhook settings", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Set webhook settings
      await updateWebhookSettings(businessId, "https://example.com/webhook");

      // Clear them
      await updateWebhookSettings(businessId, null);

      const settings = await getWebhookSettings(businessId);
      expect(settings?.webhook_url).toBeNull();
      expect(settings?.webhook_secret).toBeNull();
    });

    test("gets webhook settings", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await updateWebhookSettings(
        businessId,
        "https://example.com/webhook",
        "test_secret",
      );

      const settings = await getWebhookSettings(businessId);
      expect(settings?.webhook_url).toBe("https://example.com/webhook");
      expect(settings?.webhook_secret).toBe("test_secret");
    });
  });

  describe("webhook queue", () => {
    test("queues webhook with default delay", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await updateWebhookSettings(
        businessId,
        "https://example.com/webhook",
        "test_secret",
      );

      const webhookId = await queueWebhookDelivery(businessId, {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 8,
        comment: "Great service!",
      });

      expect(webhookId).toBeDefined();

      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].survey_id).toBe("test_survey");
      expect(queueItems[0].score).toBe(8);
      expect(queueItems[0].status).toBe("pending");
    });

    test("skips queueing when no webhook configured", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      const webhookId = await queueWebhookDelivery(businessId, {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 8,
      });

      expect(webhookId).toBeNull();

      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems).toHaveLength(0);
    });

    test("updates pending webhook comment", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await createTestWebhook(businessId, {
        surveyId: "test_survey",
        subjectId: "test_user",
        comment: undefined,
      });

      const updated = await updatePendingWebhookComment(
        businessId,
        "test_survey",
        "test_user",
        "Updated comment",
      );

      expect(updated).toBe(true);

      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].comment).toBe("Updated comment");
    });
  });

  describe("webhook delivery", () => {
    test("sends webhook successfully", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 9,
        comment: "Excellent!",
        timestamp: new Date().toISOString(),
      };

      const result = await sendWebhook(
        payload,
        mockEndpoint.url,
        "test_secret",
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
      expect(received[0].body).toEqual(payload);
      expect(received[0].headers["x-clicknps-signature"]).toStartWith(
        "sha256=",
      );
      expect(received[0].headers["x-clicknps-timestamp"]).toBeDefined();
    });

    test("handles webhook failure", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 9,
        comment: null,
        timestamp: new Date().toISOString(),
      };

      // Send to non-existent endpoint
      const result = await sendWebhook(
        payload,
        "http://localhost:99999",
        "test_secret",
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(0);
      expect(result.responseBody).toContain("fetch");
    });

    test("sends test webhook", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await updateWebhookSettings(businessId, mockEndpoint.url, "test_secret");

      const result = await sendTestWebhook(businessId);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
      expect(received[0].body.survey_id).toBe("test");
      expect(received[0].body.subject_id).toBe("test_user");
      expect(received[0].body.score).toBe(8);
    });
  });

  describe("retry logic", () => {
    test("calculates retry times with exponential backoff", () => {
      const retries = [
        calculateNextRetryTime(1), // 1 minute
        calculateNextRetryTime(2), // 5 minutes
        calculateNextRetryTime(3), // 30 minutes
        calculateNextRetryTime(4), // 2 hours
        calculateNextRetryTime(5), // 6 hours
        calculateNextRetryTime(6), // 12 hours
        calculateNextRetryTime(7), // 24 hours
        calculateNextRetryTime(10), // Still 24 hours (max)
      ];

      const now = new Date();

      // Check that retry times are in the future and follow expected pattern
      expect(retries[0].getTime()).toBeGreaterThan(now.getTime() + 50_000); // ~1 min
      expect(retries[1].getTime()).toBeGreaterThan(now.getTime() + 250_000); // ~5 min
      expect(retries[6].getTime()).toBeGreaterThan(now.getTime() + 86_000_000); // ~24 hours
      expect(retries[7].getTime()).toBeGreaterThan(now.getTime() + 86_000_000); // Still ~24 hours
    });
  });

  describe("recent deliveries", () => {
    test("gets recent webhook deliveries", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await createTestWebhook(businessId, { status: "delivered" });
      await createTestWebhook(businessId, { status: "failed" });
      await createTestWebhook(businessId, { status: "pending" });

      const deliveries = await getRecentWebhookDeliveries(businessId);

      expect(deliveries).toHaveLength(3);
      expect(deliveries.map((d) => d.status)).toContain("delivered");
      expect(deliveries.map((d) => d.status)).toContain("failed");
      expect(deliveries.map((d) => d.status)).toContain("pending");
    });

    test("limits recent deliveries", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create more than the default limit
      for (let i = 0; i < 15; i++) {
        await createTestWebhook(businessId);
      }

      const deliveries = await getRecentWebhookDeliveries(businessId, 5);
      expect(deliveries).toHaveLength(5);
    });
  });
});
