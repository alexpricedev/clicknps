import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { db } from "../../services/database";
import { invites } from "./invites";

describe("invites controller", () => {
  let businessId: string;
  let inviteToken: string;

  beforeEach(async () => {
    // Clean up test data
    await db`DELETE FROM business_invites WHERE email = 'testinvite@example.com'`;
    await db`DELETE FROM users WHERE email = 'testinvite@example.com'`;

    // Create a test business
    const businessResult = await db`
      INSERT INTO businesses (business_name, created_at, updated_at)
      VALUES ('Test Business', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    businessId = businessResult[0].id;

    // Create an invite with a known token
    inviteToken = "test-token-123";
    const tokenHash = await import("../../utils/crypto").then((m) =>
      m.computeHMAC(inviteToken),
    );

    await db`
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
    // Clean up
    await db`DELETE FROM business_invites WHERE email = 'testinvite@example.com'`;
    await db`DELETE FROM users WHERE email = 'testinvite@example.com'`;
    await db`DELETE FROM businesses WHERE id = ${businessId}`;
  });

  describe("accept", () => {
    it("should create user and redirect to dashboard with success state", async () => {
      const formData = new FormData();
      formData.append("token", inviteToken);
      formData.append("firstName", "Test");
      formData.append("lastName", "User");
      formData.append(
        "_csrf",
        await import("../../utils/crypto").then((m) =>
          m.computeHMAC(inviteToken),
        ),
      );

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
      const users = await db`
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
      formData.append(
        "_csrf",
        await import("../../utils/crypto").then((m) =>
          m.computeHMAC(inviteToken),
        ),
      );

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
