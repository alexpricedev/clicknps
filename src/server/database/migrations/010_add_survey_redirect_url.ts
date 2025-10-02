/**
 * Add redirect_url and redirect_timing columns to surveys table
 * Allows surveys to redirect users either before or after comment capture
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE surveys
    ADD COLUMN redirect_url TEXT NULL,
    ADD COLUMN redirect_timing VARCHAR(20) NULL CHECK (redirect_timing IN ('pre_comment', 'post_comment'))
  `;
};

export const down = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE surveys
    DROP COLUMN IF EXISTS redirect_url,
    DROP COLUMN IF EXISTS redirect_timing
  `;
};
