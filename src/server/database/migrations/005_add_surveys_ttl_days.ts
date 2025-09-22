/**
 * Add ttl_days column to surveys table for default link expiry
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // Add ttl_days column with default value of 30 days
  await db`
    ALTER TABLE surveys 
    ADD COLUMN ttl_days INTEGER NOT NULL DEFAULT 30 
    CHECK (ttl_days >= 1 AND ttl_days <= 365)
  `;
};

export const down = async (db: SQL): Promise<void> => {
  // Remove ttl_days column
  await db`ALTER TABLE surveys DROP COLUMN ttl_days`;
};
