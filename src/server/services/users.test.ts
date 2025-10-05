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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import { cleanupTestData, createTestBusiness } from "../test-utils/helpers";
import { getUserProfile, updateUserProfile } from "./users";

describe("Users Service", () => {
  let testBusinessId: string;
  let testUserId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);

    testUserId = randomUUID();
    await connection`
      INSERT INTO users (id, email, business_id)
      VALUES (${testUserId}, 'test@example.com', ${testBusinessId})
    `;
  });

  afterEach(async () => {
    // Ensure any hanging transactions are cleaned up
    try {
      await connection`ROLLBACK`;
    } catch {
      // Ignore if no transaction is active
    }
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("getUserProfile", () => {
    it("should return user profile with all fields", async () => {
      await connection`
        UPDATE users
        SET first_name = 'John', last_name = 'Doe'
        WHERE id = ${testUserId}
      `;

      const user = await getUserProfile(testUserId);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
      expect(user?.email).toBe("test@example.com");
      expect(user?.business_id).toBe(testBusinessId);
      expect(user?.first_name).toBe("John");
      expect(user?.last_name).toBe("Doe");
      expect(user?.created_at).toBeInstanceOf(Date);
    });

    it("should return user profile with null names as undefined", async () => {
      const user = await getUserProfile(testUserId);

      expect(user).toBeDefined();
      expect(user?.first_name).toBeUndefined();
      expect(user?.last_name).toBeUndefined();
    });

    it("should return null for non-existent user", async () => {
      const user = await getUserProfile(randomUUID());
      expect(user).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("should update both first and last name", async () => {
      const updatedUser = await updateUserProfile(testUserId, {
        first_name: "Jane",
        last_name: "Smith",
      });

      expect(updatedUser.id).toBe(testUserId);
      expect(updatedUser.first_name).toBe("Jane");
      expect(updatedUser.last_name).toBe("Smith");

      const userFromDb = await connection`
        SELECT first_name, last_name FROM users WHERE id = ${testUserId}
      `;
      expect(userFromDb[0].first_name).toBe("Jane");
      expect(userFromDb[0].last_name).toBe("Smith");
    });

    it("should update names from null to values", async () => {
      const user = await getUserProfile(testUserId);
      expect(user?.first_name).toBeUndefined();
      expect(user?.last_name).toBeUndefined();

      const updatedUser = await updateUserProfile(testUserId, {
        first_name: "John",
        last_name: "Doe",
      });

      expect(updatedUser.first_name).toBe("John");
      expect(updatedUser.last_name).toBe("Doe");
    });

    it("should update names from values to new values", async () => {
      await connection`
        UPDATE users
        SET first_name = 'OldFirst', last_name = 'OldLast'
        WHERE id = ${testUserId}
      `;

      const updatedUser = await updateUserProfile(testUserId, {
        first_name: "NewFirst",
        last_name: "NewLast",
      });

      expect(updatedUser.first_name).toBe("NewFirst");
      expect(updatedUser.last_name).toBe("NewLast");
    });

    it("should return complete user object after update", async () => {
      const updatedUser = await updateUserProfile(testUserId, {
        first_name: "Complete",
        last_name: "User",
      });

      expect(updatedUser.id).toBe(testUserId);
      expect(updatedUser.email).toBe("test@example.com");
      expect(updatedUser.business_id).toBe(testBusinessId);
      expect(updatedUser.first_name).toBe("Complete");
      expect(updatedUser.last_name).toBe("User");
      expect(updatedUser.created_at).toBeInstanceOf(Date);
    });
  });
});
