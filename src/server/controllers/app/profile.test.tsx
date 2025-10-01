import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { createBunRequest } from "../../test-utils/bun-request";
import { cleanupTestData, createTestBusiness } from "../../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

import { createSession } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { profile } from "./profile";

describe("Profile Controller", () => {
  let testBusinessId: string;
  let testUserId: string;
  let testSessionId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);

    testUserId = randomUUID();
    await connection`
      INSERT INTO users (id, email, business_id, first_name, last_name)
      VALUES (${testUserId}, 'test@example.com', ${testBusinessId}, 'John', 'Doe')
    `;

    testSessionId = await createSession(testUserId);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("GET /settings/profile", () => {
    it("should render profile form with user data", async () => {
      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "GET",
        headers: {
          cookie: `session_id=${testSessionId}`,
        },
      });

      const response = await profile.index(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Profile Settings");
      expect(html).toContain("John");
      expect(html).toContain("Doe");
      expect(html).toContain("test@example.com");
      expect(html).toContain('type="submit"');
    });

    it("should render empty form for user without names", async () => {
      await connection`
        UPDATE users
        SET first_name = NULL, last_name = NULL
        WHERE id = ${testUserId}
      `;

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "GET",
        headers: {
          cookie: `session_id=${testSessionId}`,
        },
      });

      const response = await profile.index(req);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Profile Settings");
      expect(html).toContain("test@example.com");
    });

    it("should display success message from state", async () => {
      const req = createBunRequest(
        "http://localhost:3000/settings/profile?state=" +
          encodeURIComponent(JSON.stringify({ success: true })),
        {
          method: "GET",
          headers: {
            cookie: `session_id=${testSessionId}`,
          },
        },
      );

      const response = await profile.index(req);
      const html = await response.text();

      expect(html).toContain("Profile updated successfully");
    });

    it("should display error message from state", async () => {
      const req = createBunRequest(
        "http://localhost:3000/settings/profile?state=" +
          encodeURIComponent(JSON.stringify({ error: "Test error" })),
        {
          method: "GET",
          headers: {
            cookie: `session_id=${testSessionId}`,
          },
        },
      );

      const response = await profile.index(req);
      const html = await response.text();

      expect(html).toContain("Test error");
    });

    it("should redirect to login if not authenticated", async () => {
      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "GET",
      });

      const response = await profile.index(req);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });
  });

  describe("POST /settings/profile", () => {
    it("should update profile successfully", async () => {
      const formData = new FormData();
      formData.append("first_name", "Jane");
      formData.append("last_name", "Smith");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/settings/profile");
      expect(decodeURIComponent(location ?? "")).toContain('"success":true');

      const userFromDb = await connection`
        SELECT first_name, last_name FROM users WHERE id = ${testUserId}
      `;
      expect(userFromDb[0].first_name).toBe("Jane");
      expect(userFromDb[0].last_name).toBe("Smith");
    });

    it("should reject missing first name", async () => {
      const formData = new FormData();
      formData.append("last_name", "Smith");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "First name and last name are required",
      );
    });

    it("should reject missing last name", async () => {
      const formData = new FormData();
      formData.append("first_name", "Jane");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "First name and last name are required",
      );
    });

    it("should reject first name that is too long", async () => {
      const formData = new FormData();
      formData.append("first_name", "a".repeat(101));
      formData.append("last_name", "Smith");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "First name must be between 1 and 100 characters",
      );
    });

    it("should reject last name that is too long", async () => {
      const formData = new FormData();
      formData.append("first_name", "Jane");
      formData.append("last_name", "a".repeat(101));
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Last name must be between 1 and 100 characters",
      );
    });

    it("should trim whitespace from names", async () => {
      const formData = new FormData();
      formData.append("first_name", "  Jane  ");
      formData.append("last_name", "  Smith  ");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/profile",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);

      const userFromDb = await connection`
        SELECT first_name, last_name FROM users WHERE id = ${testUserId}
      `;
      expect(userFromDb[0].first_name).toBe("Jane");
      expect(userFromDb[0].last_name).toBe("Smith");
    });

    it("should redirect to login if not authenticated", async () => {
      const formData = new FormData();
      formData.append("first_name", "Jane");
      formData.append("last_name", "Smith");

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    it("should reject invalid CSRF token", async () => {
      const formData = new FormData();
      formData.append("first_name", "Jane");
      formData.append("last_name", "Smith");
      formData.append("_csrf", "invalid_token");

      const req = createBunRequest("http://localhost:3000/settings/profile", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await profile.update(req);

      expect(response.status).toBe(403);
    });
  });
});
