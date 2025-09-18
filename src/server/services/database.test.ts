import { describe, it, expect } from "bun:test";
import { db, testConnection } from "./database";

describe("database service", () => {
  describe("testConnection", () => {
    it("should return true when connection succeeds", async () => {
      const result = await testConnection();
      expect(result).toBe(true);
    });
  });

  describe("db instance", () => {
    it("should be defined", () => {
      expect(db).toBeDefined();
    });

    it("should be able to execute simple query", async () => {
      const result = await db`SELECT 1 as test`;
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });
  });
});