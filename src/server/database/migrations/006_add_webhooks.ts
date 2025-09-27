/**
 * Add webhook configuration and queue system
 * Adds webhook fields to businesses table and creates webhook_queue table
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // Add webhook configuration to businesses table
  await db`
    ALTER TABLE businesses 
    ADD COLUMN webhook_url TEXT NULL,
    ADD COLUMN webhook_secret TEXT NULL
  `;

  // Create webhook_queue table for delayed job processing
  await db`
    CREATE TABLE webhook_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      survey_id VARCHAR(255) NOT NULL,
      subject_id VARCHAR(255) NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
      comment TEXT NULL,
      webhook_url TEXT NOT NULL,
      webhook_secret TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMPTZ NULL,
      next_retry_at TIMESTAMPTZ NULL,
      response_status_code INTEGER NULL,
      response_body TEXT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Add indexes for performance
  await db`CREATE INDEX idx_webhook_queue_scheduled_for ON webhook_queue(scheduled_for)`;
  await db`CREATE INDEX idx_webhook_queue_status ON webhook_queue(status)`;
  await db`CREATE INDEX idx_webhook_queue_business_id ON webhook_queue(business_id)`;
  await db`CREATE INDEX idx_webhook_queue_next_retry_at ON webhook_queue(next_retry_at)`;
};

export const down = async (db: SQL): Promise<void> => {
  // Drop webhook queue table
  await db`DROP TABLE IF EXISTS webhook_queue`;

  // Remove webhook columns from businesses table
  await db`ALTER TABLE businesses DROP COLUMN IF EXISTS webhook_url`;
  await db`ALTER TABLE businesses DROP COLUMN IF EXISTS webhook_secret`;
};
