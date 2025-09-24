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
});
