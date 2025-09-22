import { randomUUID } from "node:crypto";
import type { SQL } from "bun";

/**
 * Helper function to create URL-encoded state parameter for tests
 * @param state - The state object to encode
 * @returns URL-encoded state parameter (without the ?state= prefix)
 */
export const encodeStateParam = (state: Record<string, unknown>): string => {
  return encodeURIComponent(JSON.stringify(state));
};

/**
 * Helper function to create full URL with encoded state parameter
 * @param baseUrl - The base URL (e.g., "http://localhost:3000/signup")
 * @param state - The state object to encode
 * @returns Full URL with encoded state parameter
 */
export const createStateUrl = (
  baseUrl: string,
  state: Record<string, unknown>,
): string => {
  return `${baseUrl}?state=${encodeStateParam(state)}`;
};

/**
 * Clean up test data between tests
 * Truncates all tables to provide test isolation
 *
 * @param db - The database connection to use (should be the mocked testDb from each test file)
 */
export const cleanupTestData = async (db: SQL): Promise<void> => {
  // Clean up all tables in dependency order (FK constraints)
  await db`TRUNCATE TABLE responses CASCADE`;
  await db`TRUNCATE TABLE survey_links CASCADE`;
  await db`TRUNCATE TABLE surveys CASCADE`;
  await db`TRUNCATE TABLE api_keys CASCADE`;
  await db`TRUNCATE TABLE user_tokens CASCADE`;
  await db`TRUNCATE TABLE sessions CASCADE`;
  await db`TRUNCATE TABLE users CASCADE`;
  await db`TRUNCATE TABLE businesses CASCADE`;
  await db`TRUNCATE TABLE example CASCADE`;
  // Note: migrations table is intentionally NOT truncated to preserve schema state

  try {
    await db`ALTER SEQUENCE example_id_seq RESTART WITH 1`;
  } catch {}
};

/**
 * Seed the database with test data for example table
 *
 * @param db - The database connection to use (should be the mocked testDb from each test file)
 */
export const seedTestData = async (db: SQL): Promise<void> => {
  await db`INSERT INTO example (name) VALUES (${"Test Example 1"})`;
  await db`INSERT INTO example (name) VALUES (${"Test Example 2"})`;
  await db`INSERT INTO example (name) VALUES (${"Test Example 3"})`;
};

/**
 * Generate a random email address for testing
 * Uses timestamp and random string to ensure uniqueness
 *
 * @param domain - Optional domain, defaults to "example.com"
 * @returns A unique email address for testing
 */
export const randomEmail = (domain = "example.com"): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@${domain}`;
};

/**
 * Creates a test business and returns its ID
 * Useful for tests that need business context
 */
export const createTestBusiness = async (
  connection: SQL,
  businessName = "Test Business",
): Promise<string> => {
  const businessId = randomUUID();

  await connection`
    INSERT INTO businesses (id, business_name, created_at, updated_at)
    VALUES (${businessId}, ${businessName}, NOW(), NOW())
  `;

  return businessId;
};
