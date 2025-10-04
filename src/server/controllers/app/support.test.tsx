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

const mockEmailService = {
  sendSupportRequest: mock(() => Promise.resolve()),
};

mock.module("../../services/email", () => ({
  getEmailService: () => mockEmailService,
}));

import { createSession } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { support } from "./support";

describe("Support Controller", () => {
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
    mockEmailService.sendSupportRequest.mockClear();
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("GET /settings/support", () => {
    it("should render support form", async () => {
      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "GET",
        headers: {
          cookie: `session_id=${testSessionId}`,
        },
      });

      const response = await support.index(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Support");
      expect(html).toContain('name="subject"');
      expect(html).toContain('name="message"');
      expect(html).toContain('type="submit"');
    });

    it("should display success message from state", async () => {
      const req = createBunRequest(
        "http://localhost:3000/settings/support?state=" +
          encodeURIComponent(JSON.stringify({ success: true })),
        {
          method: "GET",
          headers: {
            cookie: `session_id=${testSessionId}`,
          },
        },
      );

      const response = await support.index(req);
      const html = await response.text();

      expect(html).toContain("Support request submitted successfully");
    });

    it("should display error message from state", async () => {
      const req = createBunRequest(
        "http://localhost:3000/settings/support?state=" +
          encodeURIComponent(JSON.stringify({ error: "Test error" })),
        {
          method: "GET",
          headers: {
            cookie: `session_id=${testSessionId}`,
          },
        },
      );

      const response = await support.index(req);
      const html = await response.text();

      expect(html).toContain("Test error");
    });

    it("should redirect to login if not authenticated", async () => {
      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "GET",
      });

      const response = await support.index(req);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });
  });

  describe("POST /settings/support", () => {
    it("should create support request and send email", async () => {
      const formData = new FormData();
      formData.append("subject", "Test support request");
      formData.append(
        "message",
        "This is a test message with enough characters",
      );
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/settings/support");
      expect(decodeURIComponent(location ?? "")).toContain('"success":true');

      const supportRequests = await connection`
        SELECT * FROM support_requests WHERE user_id = ${testUserId}
      `;
      expect(supportRequests).toHaveLength(1);
      expect(supportRequests[0].subject).toBe("Test support request");
      expect(supportRequests[0].message).toBe(
        "This is a test message with enough characters",
      );

      expect(mockEmailService.sendSupportRequest).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendSupportRequest).toHaveBeenCalledWith({
        userEmail: "test@example.com",
        userName: "John Doe",
        businessName: expect.any(String),
        subject: "Test support request",
        message: "This is a test message with enough characters",
      });
    });

    it("should reject missing subject", async () => {
      const formData = new FormData();
      formData.append("message", "This is a test message");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Subject and message are required",
      );
    });

    it("should reject missing message", async () => {
      const formData = new FormData();
      formData.append("subject", "Test subject");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Subject and message are required",
      );
    });

    it("should reject subject that is too short", async () => {
      const formData = new FormData();
      formData.append("subject", "a");
      formData.append("message", "This is a test message");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Subject must be between 2 and 200 characters",
      );
    });

    it("should reject subject that is too long", async () => {
      const formData = new FormData();
      formData.append("subject", "a".repeat(201));
      formData.append("message", "This is a test message");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Subject must be between 2 and 200 characters",
      );
    });

    it("should reject message that is too short", async () => {
      const formData = new FormData();
      formData.append("subject", "Test subject");
      formData.append("message", "short");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Message must be between 10 and 2000 characters",
      );
    });

    it("should reject message that is too long", async () => {
      const formData = new FormData();
      formData.append("subject", "Test subject");
      formData.append("message", "a".repeat(2001));
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(decodeURIComponent(location ?? "")).toContain(
        "Message must be between 10 and 2000 characters",
      );
    });

    it("should trim whitespace from subject and message", async () => {
      const formData = new FormData();
      formData.append("subject", "  Test subject  ");
      formData.append("message", "  This is a test message  ");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);

      const supportRequests = await connection`
        SELECT * FROM support_requests WHERE user_id = ${testUserId}
      `;
      expect(supportRequests[0].subject).toBe("Test subject");
      expect(supportRequests[0].message).toBe("This is a test message");
    });

    it("should use email as userName if names not set", async () => {
      await connection`
        UPDATE users
        SET first_name = NULL, last_name = NULL
        WHERE id = ${testUserId}
      `;

      const formData = new FormData();
      formData.append("subject", "Test support request");
      formData.append("message", "This is a test message");
      const csrfToken = await createCsrfToken(
        testSessionId,
        "POST",
        "/settings/support",
      );
      formData.append("_csrf", csrfToken);

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      await support.submit(req);

      expect(mockEmailService.sendSupportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: "test@example.com",
        }),
      );
    });

    it("should redirect to login if not authenticated", async () => {
      const formData = new FormData();
      formData.append("subject", "Test subject");
      formData.append("message", "Test message");

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login");
    });

    it("should reject invalid CSRF token", async () => {
      const formData = new FormData();
      formData.append("subject", "Test subject");
      formData.append("message", "Test message");
      formData.append("_csrf", "invalid_token");

      const req = createBunRequest("http://localhost:3000/settings/support", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          cookie: `session_id=${testSessionId}`,
        },
        body: formData,
      });

      const response = await support.submit(req);

      expect(response.status).toBe(403);
    });
  });
});
