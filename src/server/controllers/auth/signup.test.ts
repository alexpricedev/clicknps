import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { SQL } from "bun";
import { createBunRequest } from "../../test-utils/bun-request";
import {
  cleanupTestData,
  createStateUrl,
  encodeStateParam,
  randomEmail,
} from "../../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

// Mock auth middleware to return null (unauthenticated) for most tests
mock.module("../../middleware/auth", () => ({
  redirectIfAuthenticated: mock(() => Promise.resolve(null)),
}));

import { createUser } from "../../services/auth";
import { db } from "../../services/database";
import { signup } from "./signup";

describe("Signup Controller", () => {
  beforeEach(async () => {
    await cleanupTestData(db);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("GET /signup", () => {
    test("renders signup page for unauthenticated user", async () => {
      const request = createBunRequest("http://localhost:3000/signup", {
        method: "GET",
      });
      const response = await signup.index(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Create your account");
      expect(html).toContain('name="email"');
      expect(html).toContain('name="businessName"');
      expect(html).toContain("Create account");
      expect(html).toContain("Already have an account? Sign in");
    });

    test("shows success message when emailSent is true", async () => {
      const request = createBunRequest(
        createStateUrl("http://localhost:3000/signup", { emailSent: true }),
        { method: "GET" },
      );
      const response = await signup.index(request);
      const html = await response.text();

      expect(html).toContain("Check your email!");
      expect(html).toContain("We&#x27;ve sent you a magic link");
    });

    test("shows error message when error is provided", async () => {
      const request = createBunRequest(
        createStateUrl("http://localhost:3000/signup", {
          validationError: true,
          error: "Invalid email",
        }),
        { method: "GET" },
      );
      const response = await signup.index(request);
      const html = await response.text();

      expect(html).toContain("Invalid email");
    });

    test("redirects authenticated user to home", async () => {
      // Clear previous mocks and create a new mock that returns redirect
      mock.restore();

      const mockRedirectIfAuthenticated = mock(() =>
        Promise.resolve(
          new Response("", {
            status: 303,
            headers: { Location: "/" },
          }),
        ),
      );

      mock.module("../../middleware/auth", () => ({
        redirectIfAuthenticated: mockRedirectIfAuthenticated,
      }));

      // Re-import signup after mocking
      const { signup: mockedSignup } = await import("./signup");

      const request = new Request("http://localhost:3000/signup", {
        method: "GET",
        headers: {
          cookie: "session_id=valid-session-id",
        },
      });

      const response = await mockedSignup.index(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");
      expect(mockRedirectIfAuthenticated).toHaveBeenCalled();
    });
  });

  describe("POST /signup", () => {
    test("creates new user with magic link for valid data", async () => {
      const email = randomEmail();
      const businessName = "Test Business";

      const formData = new FormData();
      formData.append("email", email);
      formData.append("businessName", businessName);

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ emailSent: true })}`,
      );

      // Verify user was created
      const users = await db`
        SELECT id, email, business_id 
        FROM users 
        WHERE email = ${email}
      `;
      expect(users).toHaveLength(1);

      // Verify business was created
      const businesses = await db`
        SELECT id, business_name 
        FROM businesses 
        WHERE business_name = ${businessName}
      `;
      expect(businesses).toHaveLength(1);

      // Verify magic link token was created
      const tokens = await db`
        SELECT id, user_id, type, expires_at 
        FROM user_tokens 
        WHERE user_id = ${(users[0] as any).id} AND type = 'magic_link'
      `;
      expect(tokens).toHaveLength(1);
    });

    test("normalizes email to lowercase", async () => {
      const email = randomEmail().toUpperCase();
      const businessName = "Test Business";

      const formData = new FormData();
      formData.append("email", email);
      formData.append("businessName", businessName);

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ emailSent: true })}`,
      );

      // Verify user was created with lowercase email
      const users = await db`
        SELECT email 
        FROM users 
        WHERE email = ${email.toLowerCase()}
      `;
      expect(users).toHaveLength(1);
    });

    test("redirects with error for existing user", async () => {
      const email = randomEmail();
      await createUser(email, "Existing Business");

      const formData = new FormData();
      formData.append("email", email);
      formData.append("businessName", "New Business");

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ validationError: true, error: "An account with this email already exists. Please sign in instead." })}`,
      );

      // Should still be only one user
      const users = await db`SELECT id FROM users WHERE email = ${email}`;
      expect(users).toHaveLength(1);
    });

    test("redirects with error for invalid email", async () => {
      const formData = new FormData();
      formData.append("email", "not-an-email");
      formData.append("businessName", "Test Business");

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ validationError: true, error: "Invalid email address" })}`,
      );
    });

    test("redirects with error for missing email", async () => {
      const formData = new FormData();
      formData.append("businessName", "Test Business");

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ validationError: true, error: "Invalid email address" })}`,
      );
    });

    test("redirects with error for missing business name", async () => {
      const formData = new FormData();
      formData.append("email", randomEmail());

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ validationError: true, error: "Business name is required" })}`,
      );
    });

    test("redirects with error for empty business name", async () => {
      const formData = new FormData();
      formData.append("email", randomEmail());
      formData.append("businessName", "   ");

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ validationError: true, error: "Business name is required" })}`,
      );
    });

    test("trims whitespace from business name", async () => {
      const email = randomEmail();
      const businessName = "  Test Business  ";

      const formData = new FormData();
      formData.append("email", email);
      formData.append("businessName", businessName);

      const request = new Request("http://localhost:3000/signup", {
        method: "POST",
        body: formData,
      });

      const response = await signup.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `/signup?state=${encodeStateParam({ emailSent: true })}`,
      );

      // Verify business was created with trimmed name
      const businesses = await db`
        SELECT business_name 
        FROM businesses 
        WHERE business_name = ${businessName.trim()}
      `;
      expect(businesses).toHaveLength(1);
    });
  });
});
