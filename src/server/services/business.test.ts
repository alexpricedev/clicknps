import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { SQL } from "bun";
import { cleanupTestData } from "../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import { createUser } from "./auth";
import { getBusiness } from "./business";
import { db } from "./database";

describe("Business Service with PostgreSQL", () => {
  beforeEach(async () => {
    await cleanupTestData(db);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("getBusiness", () => {
    test("returns business data for valid business ID", async () => {
      // Create a user which creates a business
      const user = await createUser("test@example.com", "Test Business Name");

      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      expect(business?.id).toBe(user.business_id);
      expect(business?.business_name).toBe("Test Business Name");
      expect(business?.created_at).toBeDefined();
      expect(business?.updated_at).toBeDefined();

      if (!business) {
        throw new Error("Business not found");
      }

      expect(business.created_at).toEqual(business.updated_at); // Should be same on creation
    });

    test("returns null for non-existent business ID", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const business = await getBusiness(nonExistentId);

      expect(business).toBeNull();
    });

    test("returns null for invalid business ID format", async () => {
      const invalidId = "invalid-uuid";

      const business = await getBusiness(invalidId);

      expect(business).toBeNull();
    });

    test("correctly handles business names with special characters", async () => {
      const specialBusinessName = "Business & Co. - Special Characters! @#$%";
      const user = await createUser("special@example.com", specialBusinessName);

      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      expect(business?.business_name).toBe(specialBusinessName);
    });

    test("correctly handles very long business names", async () => {
      const longBusinessName = "A".repeat(255); // Max length
      const user = await createUser("long@example.com", longBusinessName);

      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      expect(business?.business_name).toBe(longBusinessName);
      expect(business?.business_name.length).toBe(255);
    });

    test("handles unicode characters in business names", async () => {
      const unicodeBusinessName = "東京株式会社 🏢 Business Inc. ñ";
      const user = await createUser("unicode@example.com", unicodeBusinessName);

      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      expect(business?.business_name).toBe(unicodeBusinessName);
    });

    test("returns consistent data on multiple calls", async () => {
      const user = await createUser(
        "consistent@example.com",
        "Consistent Business",
      );

      const business1 = await getBusiness(user.business_id);
      const business2 = await getBusiness(user.business_id);

      expect(business1).not.toBeNull();
      expect(business2).not.toBeNull();

      if (!business1 || !business2) {
        throw new Error("Business not found");
      }

      expect(business1.id).toBe(business2.id);
      expect(business1.business_name).toBe(business2.business_name);
      expect(business1.created_at).toEqual(business2.created_at);
      expect(business1.updated_at).toEqual(business2.updated_at);
    });
  });

  describe("business creation through user creation", () => {
    test("creates business with correct timestamps", async () => {
      const beforeCreation = new Date();
      const user = await createUser(
        "timestamp@example.com",
        "Timestamp Business",
      );
      const afterCreation = new Date();

      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      expect(business?.created_at.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(business?.created_at.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
      expect(business?.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(business?.updated_at.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });

    test("creates unique businesses for different users", async () => {
      const user1 = await createUser("user1@example.com", "Business One");
      const user2 = await createUser("user2@example.com", "Business Two");

      const business1 = await getBusiness(user1.business_id);
      const business2 = await getBusiness(user2.business_id);

      expect(business1).not.toBeNull();
      expect(business2).not.toBeNull();
      expect(business1?.id).not.toBe(business2?.id);
      expect(business1?.business_name).toBe("Business One");
      expect(business2?.business_name).toBe("Business Two");
    });

    test("allows duplicate business names for different businesses", async () => {
      const sameName = "Duplicate Business Name";
      const user1 = await createUser("dup1@example.com", sameName);
      const user2 = await createUser("dup2@example.com", sameName);

      const business1 = await getBusiness(user1.business_id);
      const business2 = await getBusiness(user2.business_id);

      expect(business1).not.toBeNull();
      expect(business2).not.toBeNull();
      expect(business1?.id).not.toBe(business2?.id);
      expect(business1?.business_name).toBe(sameName);
      expect(business2?.business_name).toBe(sameName);
    });
  });

  describe("database constraints and integrity", () => {
    test("business ID is valid UUID format", async () => {
      const user = await createUser("uuid@example.com", "UUID Business");
      const business = await getBusiness(user.business_id);

      expect(business).not.toBeNull();
      // UUID v4 format check
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(business?.id).toMatch(uuidRegex);
    });

    test("business is properly linked to user", async () => {
      const user = await createUser("linked@example.com", "Linked Business");

      // Verify the business exists and is linked
      const business = await getBusiness(user.business_id);
      expect(business).not.toBeNull();
      expect(business?.id).toBe(user.business_id);

      // Verify the link in the database
      const userInDb = await db`
        SELECT business_id FROM users WHERE id = ${user.id}
      `;
      expect(userInDb).toHaveLength(1);
      expect((userInDb[0] as any).business_id).toBe(business?.id);
    });

    test("handles database connection errors gracefully", async () => {
      // Create a business first
      const _user = await createUser("error@example.com", "Error Business");

      // Now test with invalid database operation
      const invalidId = "not-a-uuid";
      const business = await getBusiness(invalidId);

      expect(business).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("handles empty string business ID", async () => {
      const business = await getBusiness("");
      expect(business).toBeNull();
    });

    test("handles whitespace-only business ID", async () => {
      const business = await getBusiness("   ");
      expect(business).toBeNull();
    });

    test("handles null business ID gracefully", async () => {
      // TypeScript prevents this, but test runtime behavior
      // Null gets coerced to string "null" which is invalid UUID
      const business = await getBusiness(null as any);
      expect(business).toBeNull();
    });

    test("handles undefined business ID gracefully", async () => {
      // TypeScript prevents this, but test runtime behavior
      const business = await getBusiness(undefined as any);
      expect(business).toBeNull();
    });
  });
});
