import { afterAll, describe, expect, it, mock } from "bun:test";
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

import { db, testConnection } from "./database";

describe("database service", () => {
  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

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
