import { db } from "../services/database";
import { processQueueNow } from "../services/queue-worker";
import type { WebhookQueueItem } from "../services/webhooks";

/**
 * Wait for webhook queue to be processed within timeout
 * Useful for integration tests
 */
export const waitForWebhookQueue = async (timeoutMs = 5000): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if there are any pending webhooks
    const pending = await db`
      SELECT COUNT(*) as count 
      FROM webhook_queue 
      WHERE status = 'pending' AND scheduled_for <= CURRENT_TIMESTAMP
    `;

    const pendingCount = pending[0]?.count || 0;

    if (pendingCount === 0) {
      return; // No pending webhooks
    }

    // Process the queue and wait a bit
    await processQueueNow();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timeout waiting for webhook queue to be processed after ${timeoutMs}ms`,
  );
};

/**
 * Mock webhook endpoint that captures received webhooks
 * Returns a function to get captured webhooks and cleanup
 */
type WebhookPayload = {
  survey_id: string;
  subject_id: string;
  score: number;
  comment: string | null;
  timestamp: string;
};

export const mockWebhookEndpoint = (
  port = 9999,
): {
  getReceivedWebhooks: () => Array<{
    headers: Record<string, string>;
    body: WebhookPayload;
    timestamp: Date;
  }>;
  cleanup: () => void;
  url: string;
} => {
  const receivedWebhooks: Array<{
    headers: Record<string, string>;
    body: WebhookPayload;
    timestamp: Date;
  }> = [];

  const server = Bun.serve({
    port,
    async fetch(req) {
      if (req.method === "POST") {
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headers[key] = value;
        });

        let body: WebhookPayload;
        try {
          body = (await req.json()) as WebhookPayload;
        } catch {
          // If JSON parsing fails, create a default payload
          body = {
            survey_id: "unknown",
            subject_id: "unknown",
            score: 0,
            comment: null,
            timestamp: new Date().toISOString(),
          };
        }

        receivedWebhooks.push({
          headers,
          body,
          timestamp: new Date(),
        });

        return new Response("OK", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return {
    getReceivedWebhooks: () => receivedWebhooks,
    cleanup: () => server.stop(),
    url: `http://localhost:${port}`,
  };
};

/**
 * Advance time for scheduled webhooks in tests
 * Updates scheduled_for timestamps to simulate time passing
 */
export const advanceWebhookTime = async (seconds: number): Promise<void> => {
  await db`
    UPDATE webhook_queue
    SET scheduled_for = scheduled_for - INTERVAL '${seconds} seconds'
    WHERE status = 'pending'
  `;
};

/**
 * Force immediate processing of webhook queue
 * Alias for processQueueNow for test clarity
 */
export const processWebhookQueueNow = processQueueNow;

/**
 * Clear all webhook queue entries (for test cleanup)
 */
export const clearWebhookQueue = async (): Promise<void> => {
  await db`DELETE FROM webhook_queue`;
};

/**
 * Get webhook queue items for testing
 */
export const getWebhookQueueItems = async (
  businessId?: string,
): Promise<WebhookQueueItem[]> => {
  if (businessId) {
    const result = await db`
      SELECT *
      FROM webhook_queue
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;
    return result as WebhookQueueItem[];
  }

  const result = await db`
    SELECT *
    FROM webhook_queue
    ORDER BY created_at DESC
  `;
  return result as WebhookQueueItem[];
};

/**
 * Wait for specific webhook status
 */
export const waitForWebhookStatus = async (
  businessId: string,
  surveyId: string,
  subjectId: string,
  expectedStatus: "pending" | "processing" | "delivered" | "failed",
  timeoutMs = 5000,
): Promise<WebhookQueueItem> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await db`
      SELECT *
      FROM webhook_queue
      WHERE business_id = ${businessId}
        AND survey_id = ${surveyId}
        AND subject_id = ${subjectId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length > 0) {
      const webhook = result[0] as WebhookQueueItem;
      if (webhook.status === expectedStatus) {
        return webhook;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Timeout waiting for webhook status '${expectedStatus}' after ${timeoutMs}ms`,
  );
};

/**
 * Create a test webhook queue item
 */
export const createTestWebhook = async (
  businessId: string,
  options: {
    surveyId?: string;
    subjectId?: string;
    score?: number;
    comment?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    scheduledFor?: Date;
    status?: "pending" | "processing" | "delivered" | "failed";
  } = {},
): Promise<string> => {
  const id = crypto.randomUUID();
  const scheduledFor = options.scheduledFor || new Date();

  await db`
    INSERT INTO webhook_queue (
      id, business_id, survey_id, subject_id, score, comment,
      webhook_url, webhook_secret, scheduled_for, status
    )
    VALUES (
      ${id}, ${businessId}, ${options.surveyId || "test_survey"}, 
      ${options.subjectId || "test_subject"}, ${options.score || 8},
      ${options.comment || null}, ${options.webhookUrl || "http://localhost:9999"},
      ${options.webhookSecret || "test_secret"}, ${scheduledFor},
      ${options.status || "pending"}
    )
  `;

  return id;
};
