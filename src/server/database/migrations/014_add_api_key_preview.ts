/**
 * Add key_preview column to api_keys table
 * Stores ck_ prefix + first 5 chars for UI display
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE api_keys
    ADD COLUMN key_preview VARCHAR(8) NULL
  `;
};

export const down = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE api_keys
    DROP COLUMN key_preview
  `;
};
