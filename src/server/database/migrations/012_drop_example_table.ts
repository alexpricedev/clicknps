/**
 * Drop example table
 * Removes the example table that was part of initial setup but is no longer used
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`DROP TABLE IF EXISTS example`;
};

export const down = async (db: SQL): Promise<void> => {
  await db`
    CREATE TABLE example (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )
  `;
};
