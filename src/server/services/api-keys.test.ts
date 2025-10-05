import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { cleanupTestData, createTestBusiness } from "../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import {
  createApiKey,
  deleteApiKey,
  findApiKeyByToken,
  getApiKeysByBusiness,
  rotateApiKey,
} from "./api-keys";

import { db } from "./database";

describe("API Keys Service with PostgreSQL", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(db);
    testBusinessId = await createTestBusiness(connection);
  });

  afterEach(async () => {
    await connection`DELETE FROM api_keys WHERE business_id = ${testBusinessId}`;
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("createApiKey", () => {
    it("should create a new API key with correct format", async () => {
      const keyName = "Test API Key";
      const apiKey = await createApiKey(testBusinessId, keyName);

      expect(apiKey.id).toBeDefined();
      expect(apiKey.business_id).toBe(testBusinessId);
      expect(apiKey.name).toBe(keyName);
      expect(apiKey.token).toStartWith("ck_");
      expect(apiKey.token.length).toBe(51); // "ck_" + 48 chars
      expect(apiKey.created_at).toBeInstanceOf(Date);

      // Verify key was stored in database (without token)
      const dbKeys = await connection`
        SELECT * FROM api_keys WHERE business_id = ${testBusinessId}
      `;
      expect(dbKeys).toHaveLength(1);
      expect(dbKeys[0].id).toBe(apiKey.id);
      expect(dbKeys[0].name).toBe(keyName);
      expect(dbKeys[0].key_hash).toBeDefined();
      expect(dbKeys[0].key_hash).not.toBe(apiKey.token); // Hash should be different from token
      expect(dbKeys[0].key_preview).toBe(apiKey.token.substring(0, 8)); // "ck_" + first 5 chars
      expect(dbKeys[0].key_preview).toStartWith("ck_");
    });

    it("should create unique tokens for each key", async () => {
      const key1 = await createApiKey(testBusinessId, "Key 1");
      const key2 = await createApiKey(testBusinessId, "Key 2");

      expect(key1.token).not.toBe(key2.token);
      expect(key1.id).not.toBe(key2.id);

      // Both should be in database
      const dbKeys = await connection`
        SELECT * FROM api_keys WHERE business_id = ${testBusinessId} ORDER BY created_at
      `;
      expect(dbKeys).toHaveLength(2);
    });

    it("should allow multiple keys with same name", async () => {
      const keyName = "Production API";
      const key1 = await createApiKey(testBusinessId, keyName);
      const key2 = await createApiKey(testBusinessId, keyName);

      expect(key1.name).toBe(keyName);
      expect(key2.name).toBe(keyName);
      expect(key1.id).not.toBe(key2.id);
      expect(key1.token).not.toBe(key2.token);
    });
  });

  describe("findApiKeyByToken", () => {
    it("should find and return API key for valid token", async () => {
      const createdKey = await createApiKey(testBusinessId, "Valid Key");

      const foundKey = await findApiKeyByToken(createdKey.token);

      expect(foundKey).toBeDefined();
      if (foundKey) {
        expect(foundKey.id).toBe(createdKey.id);
        expect(foundKey.business_id).toBe(testBusinessId);
        expect(foundKey.name).toBe("Valid Key");
        expect(foundKey.key_hash).toBeDefined();
        expect(foundKey.created_at).toBeInstanceOf(Date);
        expect(foundKey.last_used_at).toBeNull(); // Should be null initially
      }
    });

    it("should update last_used_at timestamp when key is found", async () => {
      const createdKey = await createApiKey(
        testBusinessId,
        "Usage Tracking Key",
      );

      // First usage
      const foundKey1 = await findApiKeyByToken(createdKey.token);
      expect(foundKey1?.last_used_at).toBeNull();

      // Check database was updated
      const dbKey1 = await connection`
        SELECT last_used_at FROM api_keys WHERE id = ${createdKey.id}
      `;
      expect(dbKey1[0].last_used_at).toBeInstanceOf(Date);

      // Wait a moment and use again
      await new Promise((resolve) => setTimeout(resolve, 10));

      const foundKey2 = await findApiKeyByToken(createdKey.token);
      const dbKey2 = await connection`
        SELECT last_used_at FROM api_keys WHERE id = ${createdKey.id}
      `;

      expect(foundKey2).toBeDefined();
      expect(dbKey2[0].last_used_at).toBeInstanceOf(Date);
      expect(dbKey2[0].last_used_at.getTime()).toBeGreaterThan(
        dbKey1[0].last_used_at.getTime(),
      );
    });

    it("should return null for invalid token", async () => {
      const result = await findApiKeyByToken("invalid_token");
      expect(result).toBeNull();
    });

    it("should return null for token without ck_ prefix", async () => {
      const result = await findApiKeyByToken("some_other_prefix_token");
      expect(result).toBeNull();
    });

    it("should return null for empty or null token", async () => {
      const result1 = await findApiKeyByToken("");
      const result2 = await findApiKeyByToken(null as any);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should return null for non-existent but valid format token", async () => {
      const result = await findApiKeyByToken(
        "ck_this_is_a_fake_token_that_should_not_exist_in_database",
      );
      expect(result).toBeNull();
    });

    it("should handle corrupted token gracefully", async () => {
      // Test with malformed token that might cause HMAC computation to fail
      const result = await findApiKeyByToken("ck_\x00\x01\x02\x03");
      expect(result).toBeNull();
    });
  });

  describe("getApiKeysByBusiness", () => {
    it("should return empty array when no keys exist", async () => {
      const keys = await getApiKeysByBusiness(testBusinessId);
      expect(keys).toEqual([]);
    });

    it("should return all keys for a business ordered by created_at DESC", async () => {
      // Create keys with small delay to ensure different timestamps
      const _key1 = await createApiKey(testBusinessId, "First Key");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const _key2 = await createApiKey(testBusinessId, "Second Key");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const _key3 = await createApiKey(testBusinessId, "Third Key");

      const keys = await getApiKeysByBusiness(testBusinessId);

      expect(keys).toHaveLength(3);

      // Should be ordered by created_at DESC (newest first)
      expect(keys[0].name).toBe("Third Key");
      expect(keys[1].name).toBe("Second Key");
      expect(keys[2].name).toBe("First Key");

      // Should not include key_hash or token but should include key_preview
      keys.forEach((key) => {
        expect(key.id).toBeDefined();
        expect(key.business_id).toBe(testBusinessId);
        expect(key.name).toBeDefined();
        expect(key.key_preview).toBeDefined();
        expect(key.key_preview).toHaveLength(8);
        expect(key.key_preview).toStartWith("ck_");
        expect(key.created_at).toBeInstanceOf(Date);
        expect("key_hash" in key).toBe(false);
        expect("token" in key).toBe(false);
      });
    });

    it("should only return keys for the specified business", async () => {
      const otherBusinessId = await createTestBusiness(connection);

      // Create keys for both businesses
      await createApiKey(testBusinessId, "My Business Key");
      await createApiKey(otherBusinessId, "Other Business Key");

      const myKeys = await getApiKeysByBusiness(testBusinessId);
      const otherKeys = await getApiKeysByBusiness(otherBusinessId);

      expect(myKeys).toHaveLength(1);
      expect(myKeys[0].name).toBe("My Business Key");
      expect(myKeys[0].business_id).toBe(testBusinessId);

      expect(otherKeys).toHaveLength(1);
      expect(otherKeys[0].name).toBe("Other Business Key");
      expect(otherKeys[0].business_id).toBe(otherBusinessId);
    });

    it("should include last_used_at when available", async () => {
      const createdKey = await createApiKey(testBusinessId, "Used Key");

      // Use the key to set last_used_at
      await findApiKeyByToken(createdKey.token);

      const keys = await getApiKeysByBusiness(testBusinessId);
      expect(keys).toHaveLength(1);
      expect(keys[0].last_used_at).toBeInstanceOf(Date);
    });
  });

  describe("deleteApiKey", () => {
    it("should delete existing API key", async () => {
      const createdKey = await createApiKey(testBusinessId, "To Delete");

      const deleted = await deleteApiKey(createdKey.id, testBusinessId);
      expect(deleted).toBe(true);

      // Verify key is gone from database
      const dbKeys = await connection`
        SELECT * FROM api_keys WHERE id = ${createdKey.id}
      `;
      expect(dbKeys).toHaveLength(0);
    });

    it("should return false for non-existent key", async () => {
      const fakeId = randomUUID();
      const deleted = await deleteApiKey(fakeId, testBusinessId);
      expect(deleted).toBe(false);
    });

    it("should return false when trying to delete key from wrong business", async () => {
      const otherBusinessId = await createTestBusiness(connection);
      const createdKey = await createApiKey(
        otherBusinessId,
        "Wrong Business Key",
      );

      // Try to delete with wrong business ID
      const deleted = await deleteApiKey(createdKey.id, testBusinessId);
      expect(deleted).toBe(false);

      // Key should still exist
      const dbKeys = await connection`
        SELECT * FROM api_keys WHERE id = ${createdKey.id}
      `;
      expect(dbKeys).toHaveLength(1);
    });

    it("should not affect other keys when deleting one", async () => {
      const _key1 = await createApiKey(testBusinessId, "Keep Me");
      const key2 = await createApiKey(testBusinessId, "Delete Me");

      const deleted = await deleteApiKey(key2.id, testBusinessId);
      expect(deleted).toBe(true);

      // Verify only one key remains
      const remainingKeys = await getApiKeysByBusiness(testBusinessId);
      expect(remainingKeys).toHaveLength(1);
      expect(remainingKeys[0].name).toBe("Keep Me");
    });
  });

  describe("rotateApiKey", () => {
    it("should create new key with same name and delete old one", async () => {
      const originalKey = await createApiKey(testBusinessId, "Rotate Me");
      const originalToken = originalKey.token;

      const newKey = await rotateApiKey(originalKey.id, testBusinessId);

      expect(newKey).toBeDefined();
      if (newKey) {
        expect(newKey.name).toBe("Rotate Me"); // Same name
        expect(newKey.business_id).toBe(testBusinessId);
        expect(newKey.id).not.toBe(originalKey.id); // New ID
        expect(newKey.token).not.toBe(originalToken); // New token
        expect(newKey.token).toStartWith("ck_");
        expect(newKey.created_at).toBeInstanceOf(Date);
      }

      // Original key should be gone
      const oldKeyResult = await findApiKeyByToken(originalToken);
      expect(oldKeyResult).toBeNull();

      // New key should work
      expect(newKey).toBeDefined();
      if (newKey) {
        const newKeyResult = await findApiKeyByToken(newKey.token);
        expect(newKeyResult).toBeDefined();
        expect(newKeyResult?.id).toBe(newKey.id);

        // Should still only have one key in database
        const allKeys = await getApiKeysByBusiness(testBusinessId);
        expect(allKeys).toHaveLength(1);
        expect(allKeys[0].id).toBe(newKey.id);
      }
    });

    it("should return null for non-existent key", async () => {
      const fakeId = randomUUID();
      const result = await rotateApiKey(fakeId, testBusinessId);
      expect(result).toBeNull();
    });

    it("should return null when trying to rotate key from wrong business", async () => {
      const otherBusinessId = await createTestBusiness(connection);
      const createdKey = await createApiKey(otherBusinessId, "Wrong Business");

      const result = await rotateApiKey(createdKey.id, testBusinessId);
      expect(result).toBeNull();

      // Original key should still exist
      const originalStillWorks = await findApiKeyByToken(createdKey.token);
      expect(originalStillWorks).toBeDefined();
    });

    it("should handle rotation failure gracefully", async () => {
      const createdKey = await createApiKey(testBusinessId, "Rotation Test");

      // Delete the key manually to simulate a race condition
      await connection`DELETE FROM api_keys WHERE id = ${createdKey.id}`;

      const result = await rotateApiKey(createdKey.id, testBusinessId);
      expect(result).toBeNull();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete API key lifecycle", async () => {
      // 1. Create API key
      const createdKey = await createApiKey(testBusinessId, "Lifecycle Test");
      expect(createdKey.token).toStartWith("ck_");

      // 2. Find and use the key
      const foundKey = await findApiKeyByToken(createdKey.token);
      expect(foundKey?.id).toBe(createdKey.id);

      // 3. List keys for business
      const allKeys = await getApiKeysByBusiness(testBusinessId);
      expect(allKeys).toHaveLength(1);
      expect(allKeys[0].name).toBe("Lifecycle Test");
      expect(allKeys[0].last_used_at).toBeInstanceOf(Date);

      // 4. Rotate the key
      const rotatedKey = await rotateApiKey(createdKey.id, testBusinessId);
      expect(rotatedKey?.name).toBe("Lifecycle Test");
      expect(rotatedKey?.token).not.toBe(createdKey.token);

      // 5. Old key should no longer work
      const oldKeyCheck = await findApiKeyByToken(createdKey.token);
      expect(oldKeyCheck).toBeNull();

      // 6. New key should work
      expect(rotatedKey).toBeDefined();
      if (rotatedKey) {
        const newKeyCheck = await findApiKeyByToken(rotatedKey.token);
        expect(newKeyCheck?.id).toBe(rotatedKey.id);

        // 7. Delete the rotated key
        const deleted = await deleteApiKey(rotatedKey.id, testBusinessId);
        expect(deleted).toBe(true);
      }

      // 8. No keys should remain
      const finalKeys = await getApiKeysByBusiness(testBusinessId);
      expect(finalKeys).toHaveLength(0);
    });

    it("should support multiple keys for same business", async () => {
      // Create multiple keys
      const prodKey = await createApiKey(testBusinessId, "Production");
      const stagingKey = await createApiKey(testBusinessId, "Staging");
      const devKey = await createApiKey(testBusinessId, "Development");

      // All should be findable
      const foundProd = await findApiKeyByToken(prodKey.token);
      const foundStaging = await findApiKeyByToken(stagingKey.token);
      const foundDev = await findApiKeyByToken(devKey.token);

      expect(foundProd?.name).toBe("Production");
      expect(foundStaging?.name).toBe("Staging");
      expect(foundDev?.name).toBe("Development");

      // All should be listed
      const allKeys = await getApiKeysByBusiness(testBusinessId);
      expect(allKeys).toHaveLength(3);

      // Delete one
      await deleteApiKey(stagingKey.id, testBusinessId);

      // Should have two remaining
      const remainingKeys = await getApiKeysByBusiness(testBusinessId);
      expect(remainingKeys).toHaveLength(2);
      expect(remainingKeys.map((k) => k.name).sort()).toEqual([
        "Development",
        "Production",
      ]);
    });
  });
});
