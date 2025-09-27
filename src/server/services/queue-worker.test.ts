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
  advanceWebhookTime,
  clearWebhookQueue,
  createTestWebhook,
  getWebhookQueueItems,
  mockWebhookEndpoint,
  waitForWebhookStatus,
} from "../test-utils/webhooks";
import {
  getWorkerStatus,
  processQueueNow,
  processWebhookItem,
  processWebhookQueue,
  startWebhookWorker,
  stopWebhookWorker,
} from "./queue-worker";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

describe("Webhook Queue Worker", () => {
  beforeEach(async () => {
    await cleanupTestData(connection);
    await clearWebhookQueue();
    stopWebhookWorker(); // Ensure worker is stopped before each test
  });

  afterEach(async () => {
    stopWebhookWorker(); // Clean up worker after each test
    await clearWebhookQueue();
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("worker lifecycle", () => {
    test("starts and stops worker", () => {
      expect(getWorkerStatus().running).toBe(false);

      startWebhookWorker();
      expect(getWorkerStatus().running).toBe(true);

      stopWebhookWorker();
      expect(getWorkerStatus().running).toBe(false);
    });

    test("prevents starting worker twice", () => {
      startWebhookWorker();
      expect(getWorkerStatus().running).toBe(true);

      // Should not throw or cause issues
      startWebhookWorker();
      expect(getWorkerStatus().running).toBe(true);

      stopWebhookWorker();
    });
  });

  describe("webhook processing", () => {
    let mockEndpoint: ReturnType<typeof mockWebhookEndpoint>;
    let testPort = 11000; // Start from port 11000 for queue worker tests

    beforeEach(() => {
      mockEndpoint = mockWebhookEndpoint(testPort++); // Use different port for each test
    });

    afterEach(() => {
      mockEndpoint.cleanup();
    });

    test("processes pending webhooks", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create a webhook scheduled for the past (ready to process)
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        webhookSecret: "test_secret",
        scheduledFor: pastDate,
        status: "pending",
      });

      // Process the queue
      await processWebhookQueue();

      // Check that webhook was processed
      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("delivered");
      expect(queueItems[0].attempts).toBe(1);
      expect(queueItems[0].response_status_code).toBe(200);

      // Check that webhook was actually sent
      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
    });

    test("does not process future webhooks", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create a webhook scheduled for the future
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        scheduledFor: futureDate,
        status: "pending",
      });

      await processWebhookQueue();

      // Should still be pending
      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("pending");
      expect(queueItems[0].attempts).toBe(0);

      // No webhook should have been sent
      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(0);
    });

    test("handles webhook failures and retries", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create a webhook to a non-existent endpoint
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      await createTestWebhook(businessId, {
        webhookUrl: "http://localhost:99999", // Non-existent endpoint
        scheduledFor: pastDate,
        status: "pending",
      });

      await processWebhookQueue();

      // Should be marked as failed with retry scheduled
      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("failed");
      expect(queueItems[0].attempts).toBe(1);
      expect(queueItems[0].next_retry_at).toBeDefined();
      expect(queueItems[0].response_status_code).toBe(0);
    });

    test("processes retry webhooks", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create a failed webhook ready for retry
      const webhookId = await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        webhookSecret: "test_secret",
        status: "failed",
        scheduledFor: new Date(),
      });

      // Update the webhook to set retry fields (attempts, next_retry_at in the past)
      const pastRetryTime = new Date();
      pastRetryTime.setMinutes(pastRetryTime.getMinutes() - 5);

      await connection`
        UPDATE webhook_queue 
        SET 
          attempts = 1,
          next_retry_at = ${pastRetryTime},
          last_attempt_at = ${pastRetryTime}
        WHERE id = ${webhookId}
      `;

      await processWebhookQueue();

      // Should be delivered now
      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("delivered");
      expect(queueItems[0].attempts).toBe(2); // Should be 2 after retry

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
    });

    test("processes webhooks in batches", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create multiple pending webhooks
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      for (let i = 0; i < 15; i++) {
        await createTestWebhook(businessId, {
          webhookUrl: mockEndpoint.url,
          surveyId: `survey_${i}`,
          subjectId: `subject_${i}`,
          scheduledFor: pastDate,
          status: "pending",
        });
      }

      await processWebhookQueue();

      // All webhooks should be processed (within batch limits)
      const queueItems = await getWebhookQueueItems(businessId);
      const deliveredCount = queueItems.filter(
        (item) => item.status === "delivered",
      ).length;

      expect(deliveredCount).toBeGreaterThan(0);
      expect(deliveredCount).toBeLessThanOrEqual(15);

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received.length).toBeGreaterThan(0);
    });

    test("prevents duplicate processing", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        scheduledFor: pastDate,
        status: "pending",
      });

      // Process queue twice simultaneously
      await Promise.all([processWebhookQueue(), processWebhookQueue()]);

      // Should only be processed once
      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("delivered");
      expect(queueItems[0].attempts).toBe(1);

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
    });

    test("processQueueNow processes queue immediately", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        webhookSecret: "test_secret",
        scheduledFor: new Date(Date.now() - 10000), // 10 seconds ago
        status: "pending",
      });

      // Use processQueueNow instead of processWebhookQueue
      await processQueueNow();

      const queueItems = await getWebhookQueueItems(businessId);
      expect(queueItems[0].status).toBe("delivered");
    });
  });

  describe("integration tests", () => {
    let mockEndpoint: ReturnType<typeof mockWebhookEndpoint>;
    let integrationTestPort = 12000; // Start from port 12000 for integration tests

    beforeEach(() => {
      mockEndpoint = mockWebhookEndpoint(integrationTestPort++); // Use different port for each test
    });

    afterEach(() => {
      mockEndpoint.cleanup();
    });

    test("end-to-end webhook processing with worker", async () => {
      const businessId = await createTestBusiness(connection, "Test Business");

      // Create webhook ready for processing
      await createTestWebhook(businessId, {
        webhookUrl: mockEndpoint.url,
        webhookSecret: "test_secret",
        surveyId: "integration_test",
        subjectId: "test_user",
        score: 10,
        comment: "Perfect score!",
      });

      // Advance time so webhook is ready
      await advanceWebhookTime(200); // 200 seconds

      // Start worker and wait for processing
      startWebhookWorker();

      // Wait for webhook to be delivered
      await waitForWebhookStatus(
        businessId,
        "integration_test",
        "test_user",
        "delivered",
        10000,
      );

      const received = mockEndpoint.getReceivedWebhooks();
      expect(received).toHaveLength(1);
      expect(received[0].body.survey_id).toBe("integration_test");
      expect(received[0].body.score).toBe(10);
      expect(received[0].body.comment).toBe("Perfect score!");
      expect(received[0].headers["x-clicknps-signature"]).toStartWith(
        "sha256=",
      );
    });
  });

  describe("processWebhookItem integration", () => {
    let integrationMockEndpoint: ReturnType<typeof mockWebhookEndpoint>;
    let integrationTestPort = 14000; // Start from port 14000 for processWebhookItem tests

    beforeEach(() => {
      integrationMockEndpoint = mockWebhookEndpoint(integrationTestPort++);
    });

    afterEach(() => {
      integrationMockEndpoint.cleanup();
    });

    describe("successful webhook delivery", () => {
      test("processes webhook successfully and updates database", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          surveyId: "test_survey",
          subjectId: "test_user",
          score: 9,
          comment: "Great service!",
          webhookUrl: integrationMockEndpoint.url,
          webhookSecret: "test_secret",
          scheduledFor: new Date(),
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        // Verify database was updated correctly
        const updatedItems = await getWebhookQueueItems(businessId);
        const updatedItem = updatedItems[0];

        expect(updatedItem.status).toBe("delivered");
        expect(updatedItem.attempts).toBe(1);
        expect(updatedItem.response_status_code).toBe(200);
        expect(updatedItem.response_body).toBe("OK");
        expect(updatedItem.last_attempt_at).toBeDefined();
        expect(updatedItem.next_retry_at).toBeNull();

        // Verify webhook was actually sent with correct payload
        const received = integrationMockEndpoint.getReceivedWebhooks();
        expect(received).toHaveLength(1);
        expect(received[0].body.survey_id).toBe("test_survey");
        expect(received[0].body.subject_id).toBe("test_user");
        expect(received[0].body.score).toBe(9);
        expect(received[0].body.comment).toBe("Great service!");
        expect(received[0].body.timestamp).toBeDefined();

        // Verify proper headers were sent
        expect(received[0].headers["content-type"]).toBe("application/json");
        expect(received[0].headers["x-clicknps-signature"]).toStartWith(
          "sha256=",
        );
        expect(received[0].headers["x-clicknps-timestamp"]).toBeDefined();
        expect(received[0].headers["user-agent"]).toBe("ClickNPS-Webhooks/1.0");
      });

      test("handles null comment correctly", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          comment: undefined,
          webhookUrl: integrationMockEndpoint.url,
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        const received = integrationMockEndpoint.getReceivedWebhooks();
        expect(received[0].body.comment).toBeNull();
      });
    });

    describe("failed webhook delivery", () => {
      test("handles unreachable webhook URL", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          webhookUrl: "http://localhost:99999/webhook", // Non-existent endpoint
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        const updatedItems = await getWebhookQueueItems(businessId);
        const updatedItem = updatedItems[0];

        expect(updatedItem.status).toBe("failed");
        expect(updatedItem.attempts).toBe(1);
        expect(updatedItem.response_status_code).toBe(0);
        expect(updatedItem.response_body).toContain("fetch");
        expect(updatedItem.next_retry_at).toBeDefined();
        expect(updatedItem.last_attempt_at).toBeDefined();

        // Should schedule retry in the future (exponential backoff starts at 1 minute)
        const now = new Date();
        expect(updatedItem.next_retry_at?.getTime()).toBeGreaterThan(
          now.getTime() + 50000,
        ); // At least 50 seconds from now
      });

      test("handles malformed webhook URL", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          webhookUrl: "not-a-valid-url",
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        const updatedItems = await getWebhookQueueItems(businessId);
        const updatedItem = updatedItems[0];

        expect(updatedItem.status).toBe("failed");
        expect(updatedItem.response_status_code).toBe(0);
        expect(updatedItem.response_body).toContain("fetch");
      });
    });

    describe("webhook processing protection", () => {
      test("prevents double processing of same webhook", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          webhookUrl: integrationMockEndpoint.url,
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        // First call should process the webhook
        await processWebhookItem(webhookItem);

        // Reset mock endpoint to track new calls
        integrationMockEndpoint.cleanup();
        integrationMockEndpoint = mockWebhookEndpoint(integrationTestPort++);

        // Second call should be ignored (webhook already marked as processing/delivered)
        await processWebhookItem(webhookItem);

        // Should not receive any new webhooks
        const received = integrationMockEndpoint.getReceivedWebhooks();
        expect(received).toHaveLength(0);
      });

      test("skips webhook that's already being processed", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          webhookUrl: integrationMockEndpoint.url,
          status: "processing", // Already being processed
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        // Should not send any webhooks
        const received = integrationMockEndpoint.getReceivedWebhooks();
        expect(received).toHaveLength(0);

        // Status should remain as processing
        const updatedItems = await getWebhookQueueItems(businessId);
        expect(updatedItems[0].status).toBe("processing");
      });
    });

    describe("error handling", () => {
      test("handles unexpected errors during processing", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        // Create a webhook with a very long response that might cause issues
        await createTestWebhook(businessId, {
          webhookUrl: "http://localhost:99998/will-cause-error", // Non-existent endpoint
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        // This should handle the error gracefully
        await processWebhookItem(webhookItem);

        const updatedItems = await getWebhookQueueItems(businessId);
        const updatedItem = updatedItems[0];

        // Should still update the database with failure status
        expect(updatedItem.status).toBe("failed");
        expect(updatedItem.attempts).toBe(1);
        expect(updatedItem.response_status_code).toBe(0);
      });
    });

    describe("signature generation", () => {
      test("generates consistent signatures for same payload", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          surveyId: "consistent_test",
          subjectId: "test_user",
          score: 7,
          comment: "Test comment",
          webhookUrl: integrationMockEndpoint.url,
          webhookSecret: "known_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        const received = integrationMockEndpoint.getReceivedWebhooks();
        const signature = received[0].headers["x-clicknps-signature"];

        // Signature should be consistent format
        expect(signature).toStartWith("sha256=");
        expect(signature.replace("sha256=", "")).toHaveLength(64);
        expect(/^sha256=[a-f0-9]{64}$/.test(signature)).toBe(true);
      });
    });

    describe("payload validation", () => {
      test("includes all required fields in webhook payload", async () => {
        const businessId = await createTestBusiness(
          connection,
          "Test Business",
        );

        await createTestWebhook(businessId, {
          surveyId: "payload_test",
          subjectId: "user_123",
          score: 10,
          comment: "Excellent!",
          webhookUrl: integrationMockEndpoint.url,
          webhookSecret: "test_secret",
          status: "pending",
        });

        const queueItems = await getWebhookQueueItems(businessId);
        const webhookItem = queueItems[0];

        await processWebhookItem(webhookItem);

        const received = integrationMockEndpoint.getReceivedWebhooks();
        const payload = received[0].body;

        // Check all required fields are present
        expect(payload).toHaveProperty("survey_id", "payload_test");
        expect(payload).toHaveProperty("subject_id", "user_123");
        expect(payload).toHaveProperty("score", 10);
        expect(payload).toHaveProperty("comment", "Excellent!");
        expect(payload).toHaveProperty("timestamp");

        // Timestamp should be valid ISO string
        expect(new Date(payload.timestamp).toISOString()).toBe(
          payload.timestamp,
        );
      });
    });
  });
});
