/**
 * Add first_name and last_name to users table
 * These fields are nullable to support existing users
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE users
    ADD COLUMN first_name VARCHAR(100),
    ADD COLUMN last_name VARCHAR(100)
  `;
};

export const down = async (db: SQL): Promise<void> => {
  await db`
    ALTER TABLE users
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS last_name
  `;
};
