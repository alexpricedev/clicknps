import { createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  type DatabaseMutationResult,
  hasAffectedRows,
} from "../utils/database";
import { db } from "./database";

export interface WebhookSettings {
  webhook_url: string | null;
  webhook_secret: string | null;
}

export interface WebhookQueueItem {
  id: string;
  business_id: string;
  survey_id: string;
  subject_id: string;
  score: number;
  comment: string | null;
  webhook_url: string;
  webhook_secret: string;
  scheduled_for: Date;
  status: "pending" | "processing" | "delivered" | "failed";
  attempts: number;
  last_attempt_at: Date | null;
  next_retry_at: Date | null;
  response_status_code: number | null;
  response_body: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookPayload {
  survey_id: string;
  subject_id: string;
  score: number;
  comment: string | null;
  timestamp: string;
}

/**
 * Generate a strong random webhook secret
 */
export const generateWebhookSecret = (): string => {
  const bytes = randomBytes(32);
  return `whk_${bytes.toString("base64url")}`;
};

/**
 * Update webhook settings for a business
 * Auto-generates secret if none provided
 */
export const updateWebhookSettings = async (
  businessId: string,
  webhookUrl: string | null,
  webhookSecret?: string | null,
): Promise<{ webhook_url: string | null; webhook_secret: string | null }> => {
  let finalSecret = webhookSecret;

  // Auto-generate secret if URL is provided but no secret given
  if (webhookUrl && !webhookSecret) {
    finalSecret = generateWebhookSecret();
  }

  const result = (await db`
    UPDATE businesses
    SET 
      webhook_url = ${webhookUrl},
      webhook_secret = ${finalSecret},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${businessId}
    RETURNING webhook_url, webhook_secret
  `) as Array<{ webhook_url: string | null; webhook_secret: string | null }>;

  if (result.length === 0) {
    throw new Error("Business not found");
  }

  return result[0];
};

/**
 * Get webhook settings for a business
 */
export const getWebhookSettings = async (
  businessId: string,
): Promise<WebhookSettings | null> => {
  const result = await db`
    SELECT webhook_url, webhook_secret
    FROM businesses
    WHERE id = ${businessId}
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as WebhookSettings;
};

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export const generateWebhookSignature = (
  payload: string,
  secret: string,
): string => {
  return createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Queue a webhook for delivery with specified delay
 */
export const queueWebhookDelivery = async (
  businessId: string,
  responseData: {
    survey_id: string;
    subject_id: string;
    score: number;
    comment?: string | null;
  },
  delaySeconds = 180,
): Promise<string | null> => {
  // Get webhook settings for this business
  const settings = await getWebhookSettings(businessId);

  if (!settings?.webhook_url || !settings?.webhook_secret) {
    // No webhook configured, skip queuing
    return null;
  }

  const scheduledFor = new Date();
  scheduledFor.setSeconds(scheduledFor.getSeconds() + delaySeconds);

  const id = randomUUID();

  await db`
    INSERT INTO webhook_queue (
      id, business_id, survey_id, subject_id, score, comment,
      webhook_url, webhook_secret, scheduled_for
    )
    VALUES (
      ${id}, ${businessId}, ${responseData.survey_id}, ${responseData.subject_id},
      ${responseData.score}, ${responseData.comment || null},
      ${settings.webhook_url}, ${settings.webhook_secret}, ${scheduledFor}
    )
  `;

  return id;
};

/**
 * Send HTTP POST webhook with proper headers and signature
 */
export const sendWebhook = async (
  payload: WebhookPayload,
  webhookUrl: string,
  webhookSecret: string,
): Promise<{ success: boolean; statusCode: number; responseBody: string }> => {
  const payloadJson = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadJson, webhookSecret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ClickNPS-Signature": `sha256=${signature}`,
        "X-ClickNPS-Timestamp": timestamp,
        "User-Agent": "ClickNPS-Webhooks/1.0",
      },
      body: payloadJson,
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000), // Limit stored response size
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      responseBody: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Calculate next retry time with exponential backoff
 * Retry schedule: 1min, 5min, 30min, 2hr, 6hr, 12hr, 24hr
 */
export const calculateNextRetryTime = (attempts: number): Date => {
  const retryDelays = [60, 300, 1800, 7200, 21600, 43200, 86400]; // seconds
  const delayIndex = Math.min(attempts, retryDelays.length - 1);
  const delaySecs = retryDelays[delayIndex];

  const nextRetry = new Date();
  nextRetry.setSeconds(nextRetry.getSeconds() + delaySecs);
  return nextRetry;
};

/**
 * Get pending webhooks ready for processing
 */
export const getPendingWebhooks = async (
  limit = 10,
): Promise<WebhookQueueItem[]> => {
  const result = await db`
    SELECT *
    FROM webhook_queue
    WHERE status = 'pending'
      AND scheduled_for <= CURRENT_TIMESTAMP
    ORDER BY scheduled_for ASC
    LIMIT ${limit}
  `;

  return result as WebhookQueueItem[];
};

/**
 * Get failed webhooks ready for retry
 */
export const getRetryWebhooks = async (
  limit = 10,
): Promise<WebhookQueueItem[]> => {
  const result = await db`
    SELECT *
    FROM webhook_queue
    WHERE status = 'failed'
      AND next_retry_at IS NOT NULL
      AND next_retry_at <= CURRENT_TIMESTAMP
      AND attempts < 7
    ORDER BY next_retry_at ASC
    LIMIT ${limit}
  `;

  return result as WebhookQueueItem[];
};

/**
 * Mark webhook as processing to prevent double-processing
 */
export const markWebhookProcessing = async (id: string): Promise<boolean> => {
  const result = (await db`
    UPDATE webhook_queue
    SET 
      status = 'processing',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND status IN ('pending', 'failed')
  `) as DatabaseMutationResult;

  return hasAffectedRows(result);
};

/**
 * Update webhook after delivery attempt
 */
export const updateWebhookAfterAttempt = async (
  id: string,
  success: boolean,
  statusCode: number,
  responseBody: string,
  attempts: number,
): Promise<void> => {
  const status = success ? "delivered" : "failed";
  const nextRetryAt = success ? null : calculateNextRetryTime(attempts);

  await db`
    UPDATE webhook_queue
    SET 
      status = ${status},
      attempts = ${attempts},
      last_attempt_at = CURRENT_TIMESTAMP,
      next_retry_at = ${nextRetryAt},
      response_status_code = ${statusCode},
      response_body = ${responseBody},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
};

/**
 * Get recent webhook deliveries for a business (for settings UI)
 */
export const getRecentWebhookDeliveries = async (
  businessId: string,
  limit = 10,
): Promise<WebhookQueueItem[]> => {
  const result = await db`
    SELECT *
    FROM webhook_queue
    WHERE business_id = ${businessId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result as WebhookQueueItem[];
};

/**
 * Update a pending webhook with comment (before it's sent)
 */
export const updatePendingWebhookComment = async (
  businessId: string,
  surveyId: string,
  subjectId: string,
  comment: string,
): Promise<boolean> => {
  const result = (await db`
    UPDATE webhook_queue
    SET 
      comment = ${comment},
      updated_at = CURRENT_TIMESTAMP
    WHERE business_id = ${businessId}
      AND survey_id = ${surveyId}
      AND subject_id = ${subjectId}
      AND status = 'pending'
  `) as DatabaseMutationResult;

  return hasAffectedRows(result);
};

/**
 * Send a test webhook immediately (for settings testing)
 */
export const sendTestWebhook = async (
  businessId: string,
): Promise<{ success: boolean; statusCode: number; responseBody: string }> => {
  const settings = await getWebhookSettings(businessId);

  if (!settings?.webhook_url || !settings?.webhook_secret) {
    throw new Error("Webhook not configured");
  }

  const testPayload: WebhookPayload = {
    survey_id: "test",
    subject_id: "test_user",
    score: 8,
    comment: "This is a test webhook from ClickNPS",
    timestamp: new Date().toISOString(),
  };

  return await sendWebhook(
    testPayload,
    settings.webhook_url,
    settings.webhook_secret,
  );
};
