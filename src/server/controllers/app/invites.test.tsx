import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { SQL } from "bun";
import { cleanupTestData } from "../../test-utils/helpers";
import { computeHMAC } from "../../utils/crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

import { invites } from "./invites";

describe("invites controller", () => {
  let businessId: string;
  let inviteToken: string;

  beforeEach(async () => {
    await cleanupTestData(connection);

    // Create a test business
    const businessResult = await connection`
      INSERT INTO businesses (business_name, created_at, updated_at)
      VALUES ('Test Business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    businessId = businessResult[0].id;

    // Create an invite with a known token
    inviteToken = "test-token-123";
    const tokenHash = computeHMAC(inviteToken);

    await connection`
      INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at)
      VALUES (
        gen_random_uuid(),
        ${businessId},
        'testinvite@example.com',
        'member',
        ${tokenHash},
        CURRENT_TIMESTAMP + INTERVAL '7 days'
      )
    `;
  });

  afterEach(async () => {
    await cleanupTestData(connection);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("acceptForm", () => {
    it("should render invite accept form with valid token", async () => {
      const req = new Request(
        `http://localhost:3000/invites/accept?token=${inviteToken}`,
        {
          method: "GET",
        },
      );

      const response = await invites.acceptForm(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Accept Invitation");
      expect(html).toContain("Test Business");
      expect(html).toContain("testinvite@example.com");
      expect(html).toContain("firstName");
      expect(html).toContain("lastName");
      expect(html).toContain('type="submit"');
    });

    it("should render error for invalid token", async () => {
      const req = new Request(
        "http://localhost:3000/invites/accept?token=invalid-token",
        {
          method: "GET",
        },
      );

      const response = await invites.acceptForm(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Invalid or expired invite link");
    });

    it("should return 400 if token is missing", async () => {
      const req = new Request("http://localhost:3000/invites/accept", {
        method: "GET",
      });

      const response = await invites.acceptForm(req);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid invite link");
    });

    it("should render error message from state", async () => {
      const state = encodeURIComponent(
        JSON.stringify({ error: "Something went wrong" }),
      );
      const req = new Request(
        `http://localhost:3000/invites/accept?token=${inviteToken}&state=${state}`,
        {
          method: "GET",
        },
      );

      const response = await invites.acceptForm(req);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Something went wrong");
    });

    it("should render invite form with business name", async () => {
      const req = new Request(
        `http://localhost:3000/invites/accept?token=${inviteToken}`,
        {
          method: "GET",
        },
      );

      const response = await invites.acceptForm(req);
      const html = await response.text();

      expect(html).toContain("Test Business");
      expect(html).toContain("testinvite@example.com");
    });

    it("should render admin invite form", async () => {
      // Create an admin invite
      const adminToken = "admin-token-456";
      const tokenHash = computeHMAC(adminToken);

      await connection`
        INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at)
        VALUES (
          gen_random_uuid(),
          ${businessId},
          'admin@example.com',
          'admin',
          ${tokenHash},
          CURRENT_TIMESTAMP + INTERVAL '7 days'
        )
      `;

      const req = new Request(
        `http://localhost:3000/invites/accept?token=${adminToken}`,
        {
          method: "GET",
        },
      );

      const response = await invites.acceptForm(req);
      const html = await response.text();

      expect(html).toContain("Test Business");
      expect(html).toContain("admin@example.com");
    });
  });

  describe("accept", () => {
    it("should create user and redirect to dashboard with success state", async () => {
      const formData = new FormData();
      formData.append("token", inviteToken);
      formData.append("firstName", "Test");
      formData.append("lastName", "User");
      formData.append("_csrf", computeHMAC(inviteToken));

      const req = new Request("http://localhost:3000/invites/accept", {
        method: "POST",
        body: formData,
      });

      const response = await invites.accept(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toBeTruthy();
      expect(location).toContain("/?state=");
      expect(location).toContain("Welcome%20to%20your%20team");

      // Verify user was created
      const users = await connection`
        SELECT * FROM users WHERE email = 'testinvite@example.com'
      `;
      expect(users.length).toBe(1);
      expect(users[0].first_name).toBe("Test");
      expect(users[0].last_name).toBe("User");
      expect(users[0].role).toBe("member");
    });

    it("should return error if token is missing", async () => {
      const formData = new FormData();
      formData.append("firstName", "Test");
      formData.append("lastName", "User");

      const req = new Request("http://localhost:3000/invites/accept", {
        method: "POST",
        body: formData,
      });

      const response = await invites.accept(req);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid invite link");
    });

    it("should return error if CSRF token is invalid", async () => {
      const formData = new FormData();
      formData.append("token", inviteToken);
      formData.append("firstName", "Test");
      formData.append("lastName", "User");
      formData.append("_csrf", "invalid-csrf");

      const req = new Request("http://localhost:3000/invites/accept", {
        method: "POST",
        body: formData,
      });

      const response = await invites.accept(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toContain("/invites/accept?token=");
      expect(location).toContain("error");
      expect(location).toContain("Invalid%20security%20token");
    });

    it("should return error if first name or last name is missing", async () => {
      const formData = new FormData();
      formData.append("token", inviteToken);
      formData.append("firstName", "");
      formData.append("lastName", "User");
      formData.append("_csrf", computeHMAC(inviteToken));

      const req = new Request("http://localhost:3000/invites/accept", {
        method: "POST",
        body: formData,
      });

      const response = await invites.accept(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toContain("/invites/accept?token=");
      expect(location).toContain("error");
      expect(location).toContain("required");
    });
  });
});
