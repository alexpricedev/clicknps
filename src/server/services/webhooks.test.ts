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

  describe("signature verification", () => {
    test("includes correct signature in webhook headers", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 9,
        comment: "Test comment",
        timestamp: new Date().toISOString(),
      };
      const secret = "test_secret_123";

      const result = await sendWebhook(payload, mockEndpoint.url, secret);

      expect(result.success).toBe(true);

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);

      const signature = received[0].headers["x-clicknps-signature"];
      expect(signature).toStartWith("sha256=");

      // Verify signature matches expected format (64 char hex after "sha256=")
      const hexPart = signature.replace("sha256=", "");
      expect(hexPart).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hexPart)).toBe(true);
    });

    test("signature matches expected HMAC-SHA256", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 8,
        comment: null,
        timestamp: "2024-01-01T00:00:00.000Z",
      };
      const secret = "known_secret";

      await sendWebhook(payload, mockEndpoint.url, secret);

      const received = mockEndpoint.getReceivedWebhooks();
      const receivedSignature = received[0].headers["x-clicknps-signature"];

      // Generate expected signature
      const payloadJson = JSON.stringify(payload);
      const expectedSignature = `sha256=${generateWebhookSignature(payloadJson, secret)}`;

      expect(receivedSignature).toBe(expectedSignature);
    });
  });

  describe("invalid webhook URL handling", () => {
    test("handles malformed URLs", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 7,
        comment: null,
        timestamp: new Date().toISOString(),
      };

      const result = await sendWebhook(
        payload,
        "not-a-valid-url",
        "test_secret",
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(0);
      expect(result.responseBody).toContain("fetch");
    });

    test("handles unreachable URLs", async () => {
      const payload = {
        survey_id: "test_survey",
        subject_id: "test_user",
        score: 6,
        comment: null,
        timestamp: new Date().toISOString(),
      };

      const result = await sendWebhook(
        payload,
        "http://localhost:99999/webhook",
        "test_secret",
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(0);
      expect(result.responseBody.length).toBeGreaterThan(0);
    });
  });

  describe("queue ordering", () => {
    test("processes webhooks in FIFO order by scheduled_for", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      const now = new Date();
      const webhook1Time = new Date(now.getTime() - 3000); // 3 seconds ago
      const webhook2Time = new Date(now.getTime() - 2000); // 2 seconds ago
      const webhook3Time = new Date(now.getTime() - 1000); // 1 second ago

      // Create webhooks in reverse order
      await createTestWebhook(businessId, {
        surveyId: "survey_3",
        scheduledFor: webhook3Time,
        status: "pending",
      });
      await createTestWebhook(businessId, {
        surveyId: "survey_1",
        scheduledFor: webhook1Time,
        status: "pending",
      });
      await createTestWebhook(businessId, {
        surveyId: "survey_2",
        scheduledFor: webhook2Time,
        status: "pending",
      });

      const { getPendingWebhooks } = await import("./webhooks");
      const pending = await getPendingWebhooks(10);

      // Should be ordered by scheduled_for ASC
      expect(pending).toHaveLength(3);
      expect(pending[0].survey_id).toBe("survey_1");
      expect(pending[1].survey_id).toBe("survey_2");
      expect(pending[2].survey_id).toBe("survey_3");
    });

    test("processes retry webhooks in order by next_retry_at", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      const now = new Date();
      const retry1Time = new Date(now.getTime() - 2000); // 2 seconds ago
      const retry2Time = new Date(now.getTime() - 1000); // 1 second ago

      // Create failed webhooks with retry times
      const retryId1 = crypto.randomUUID();
      const retryId2 = crypto.randomUUID();

      await connection`
        INSERT INTO webhook_queue (
          id, business_id, survey_id, subject_id, score, comment,
          webhook_url, webhook_secret, scheduled_for, status, next_retry_at, attempts
        ) VALUES
          (${retryId2}, ${businessId}, 'survey_retry_2', 'user', 5, null, 
           'http://localhost:9999', 'secret', CURRENT_TIMESTAMP, 'failed', ${retry2Time}, 1),
          (${retryId1}, ${businessId}, 'survey_retry_1', 'user', 5, null,
           'http://localhost:9999', 'secret', CURRENT_TIMESTAMP, 'failed', ${retry1Time}, 1)
      `;

      const { getRetryWebhooks } = await import("./webhooks");
      const retries = await getRetryWebhooks(10);

      // Should be ordered by next_retry_at ASC
      expect(retries).toHaveLength(2);
      expect(retries[0].survey_id).toBe("survey_retry_1");
      expect(retries[1].survey_id).toBe("survey_retry_2");
    });
  });
});
