import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { SQL } from "bun";
import { cleanupTestData, randomEmail } from "../../test-utils/helpers";
import { createMockRequest } from "../../test-utils/setup";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

import { createUser } from "../../services/auth";
import { db } from "../../services/database";
import { login } from "./login";

describe("Login Controller", () => {
  beforeEach(async () => {
    await cleanupTestData(db);
  });

  afterAll(async () => {
    await connection.end();
  });

  describe("GET /login", () => {
    test("renders login page for unauthenticated user", async () => {
      const request = createMockRequest("http://localhost:3000/login", "GET");
      const response = await login.index(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Sign in to your account");
      expect(html).toContain('name="email"');
      expect(html).toContain("Send magic link");
    });

    test("shows success message when state=email-sent", async () => {
      const request = createMockRequest(
        "http://localhost:3000/login?state=email-sent",
        "GET",
      );
      const response = await login.index(request);
      const html = await response.text();

      expect(html).toContain("Check your email!");
      expect(html).toContain("We&#x27;ve sent you a magic link");
    });

    test("shows error message when error is provided", async () => {
      const request = createMockRequest(
        "http://localhost:3000/login?state=validation-error&error=Invalid%20email",
        "GET",
      );
      const response = await login.index(request);
      const html = await response.text();

      expect(html).toContain("Invalid email");
    });

    test("redirects authenticated user to home", async () => {
      // Mock the redirectIfAuthenticated function to return a redirect response
      const mockRedirectIfAuthenticated = mock(
        () =>
          new Response("", {
            status: 303,
            headers: { Location: "/" },
          }),
      );

      // Temporarily mock the auth middleware
      mock.module("../../middleware/auth", () => ({
        redirectIfAuthenticated: mockRedirectIfAuthenticated,
      }));

      // Re-import login after mocking
      const { login: mockedLogin } = await import("./login");

      const request = new Request("http://localhost:3000/login", {
        method: "GET",
        headers: {
          cookie: "session_id=valid-session-id",
        },
      });

      const response = await mockedLogin.index(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");
      expect(mockRedirectIfAuthenticated).toHaveBeenCalled();
    });
  });

  describe("POST /login", () => {
    test("creates magic link for existing user", async () => {
      // First create a user
      const email = randomEmail();
      const user = await createUser(email, "Test Business");

      const formData = new FormData();
      formData.append("email", email);

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login?state=email-sent");

      // Verify magic link token was created for the existing user
      const tokens = await db`
        SELECT id, user_id, type, expires_at 
        FROM user_tokens 
        WHERE user_id = ${user.id} AND type = 'magic_link'
      `;
      expect(tokens).toHaveLength(1);
    });

    test("normalizes email to lowercase for existing user", async () => {
      // First create a user with lowercase email
      const email = randomEmail();
      await createUser(email, "Test Business");

      const formData = new FormData();
      formData.append("email", email.toUpperCase());

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login?state=email-sent");
    });

    test("redirects with error for non-existent user", async () => {
      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        "/login?state=validation-error&error=No+account+found+with+this+email+address.+Please+sign+up+first.",
      );
    });

    test("redirects with error for invalid email", async () => {
      const formData = new FormData();
      formData.append("email", "not-an-email");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        "/login?state=validation-error&error=Invalid+email+address",
      );
    });

    test("redirects with error for missing email", async () => {
      const formData = new FormData();

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        "/login?state=validation-error&error=Invalid+email+address",
      );
    });

    test("reuses existing user for same email", async () => {
      // Create user first using the proper auth service
      const existingUser = await createUser(
        "existing@example.com",
        "Existing Business",
      );

      const formData = new FormData();
      formData.append("email", "existing@example.com");

      const request = new Request("http://localhost:3000/login", {
        method: "POST",
        body: formData,
      });

      const response = await login.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login?state=email-sent");

      // Should still be only one user
      const users =
        await db`SELECT id FROM users WHERE email = 'existing@example.com'`;
      expect(users).toHaveLength(1);
      expect((users[0] as any).id).toBe(existingUser.id);

      // But should have created a new token
      const tokens = await db`
        SELECT id FROM user_tokens 
        WHERE user_id = ${existingUser.id} AND type = 'magic_link'
      `;
      expect(tokens).toHaveLength(1);
    });
  });
});
