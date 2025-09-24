import type { WebhookPayload, WebhookQueueItem } from "./webhooks";
import {
  getPendingWebhooks,
  getRetryWebhooks,
  markWebhookProcessing,
  sendWebhook,
  updateWebhookAfterAttempt,
} from "./webhooks";

/**
 * Global worker state
 */
let workerInterval: Timer | null = null;
let isProcessing = false;

/**
 * Process a single webhook item
 */
const processWebhookItem = async (item: WebhookQueueItem): Promise<void> => {
  // Mark as processing to prevent double-processing
  const marked = await markWebhookProcessing(item.id);
  if (!marked) {
    // Another worker picked this up
    return;
  }

  const payload: WebhookPayload = {
    survey_id: item.survey_id,
    subject_id: item.subject_id,
    score: item.score,
    comment: item.comment,
    timestamp: new Date().toISOString(),
  };

  try {
    const result = await sendWebhook(
      payload,
      item.webhook_url,
      item.webhook_secret,
    );

    await updateWebhookAfterAttempt(
      item.id,
      result.success,
      result.statusCode,
      result.responseBody,
      item.attempts + 1,
    );

    console.log(
      `Webhook ${item.id} ${result.success ? "delivered" : "failed"}: ${result.statusCode}`,
    );
  } catch (error) {
    // Handle unexpected errors during webhook processing
    await updateWebhookAfterAttempt(
      item.id,
      false,
      0,
      error instanceof Error ? error.message : "Unknown error",
      item.attempts + 1,
    );

    console.error(`Webhook ${item.id} processing error:`, error);
  }
};

/**
 * Process webhook queue - handle both pending and retry webhooks
 */
export const processWebhookQueue = async (): Promise<void> => {
  if (isProcessing) {
    // Prevent overlapping processing cycles
    return;
  }

  isProcessing = true;

  try {
    // Get pending webhooks (new ones ready to be sent)
    const pendingWebhooks = await getPendingWebhooks(10);

    // Get retry webhooks (failed ones ready for retry)
    const retryWebhooks = await getRetryWebhooks(10);

    const allWebhooks = [...pendingWebhooks, ...retryWebhooks];

    if (allWebhooks.length > 0) {
      console.log(`Processing ${allWebhooks.length} webhooks`);

      // Process webhooks concurrently but with limited parallelism
      const batchSize = 5;
      for (let i = 0; i < allWebhooks.length; i += batchSize) {
        const batch = allWebhooks.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(processWebhookItem));
      }
    }
  } catch (error) {
    console.error("Error processing webhook queue:", error);
  } finally {
    isProcessing = false;
  }
};

/**
 * Start the webhook queue worker
 * Runs every 10 seconds to check for webhooks to process
 */
export const startWebhookWorker = (): void => {
  if (workerInterval) {
    console.warn("Webhook worker is already running");
    return;
  }

  console.log("Starting webhook queue worker");

  // Process immediately on startup
  processWebhookQueue().catch((error) => {
    console.error("Initial webhook queue processing failed:", error);
  });

  // Then process every 10 seconds
  workerInterval = setInterval(() => {
    processWebhookQueue().catch((error) => {
      console.error("Webhook queue processing failed:", error);
    });
  }, 10_000);
};

/**
 * Stop the webhook queue worker
 */
export const stopWebhookWorker = (): void => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("Webhook queue worker stopped");
  }
};

/**
 * Get worker status for debugging
 */
export const getWorkerStatus = (): {
  running: boolean;
  processing: boolean;
} => {
  return {
    running: workerInterval !== null,
    processing: isProcessing,
  };
};

/**
 * Force process queue immediately (for testing)
 */
export const processQueueNow = async (): Promise<void> => {
  await processWebhookQueue();
};
