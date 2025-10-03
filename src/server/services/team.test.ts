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
import { computeHMAC } from "../utils/crypto";

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
  acceptInvite,
  getBusinessMembers,
  getInviteByToken,
  getPendingInvites,
  getUserRole,
  inviteUser,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "./team";

describe("Team Service", () => {
  let businessId: string;
  let ownerUserId: string;
  let adminUserId: string;
  let memberUserId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    businessId = await createTestBusiness(connection);

    // Create owner
    ownerUserId = randomUUID();
    await connection`
      INSERT INTO users (id, email, business_id, first_name, last_name, role)
      VALUES (${ownerUserId}, 'owner@test.com', ${businessId}, 'Owner', 'User', 'owner')
    `;

    // Create admin
    adminUserId = randomUUID();
    await connection`
      INSERT INTO users (id, email, business_id, first_name, last_name, role)
      VALUES (${adminUserId}, 'admin@test.com', ${businessId}, 'Admin', 'User', 'admin')
    `;

    // Create member
    memberUserId = randomUUID();
    await connection`
      INSERT INTO users (id, email, business_id, first_name, last_name, role)
      VALUES (${memberUserId}, 'member@test.com', ${businessId}, 'Member', 'User', 'member')
    `;
  });

  afterEach(async () => {
    await cleanupTestData(connection);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("getBusinessMembers", () => {
    it("should return all members ordered by role then creation date", async () => {
      const members = await getBusinessMembers(businessId);

      expect(members).toHaveLength(3);
      expect(members[0].role).toBe("owner");
      expect(members[0].email).toBe("owner@test.com");
      expect(members[1].role).toBe("admin");
      expect(members[1].email).toBe("admin@test.com");
      expect(members[2].role).toBe("member");
      expect(members[2].email).toBe("member@test.com");
    });

    it("should return empty array for business with no members", async () => {
      const emptyBusinessId = await createTestBusiness(connection);
      await connection`DELETE FROM users WHERE business_id = ${emptyBusinessId}`;

      const members = await getBusinessMembers(emptyBusinessId);
      expect(members).toHaveLength(0);
    });
  });

  describe("getPendingInvites", () => {
    it("should return only pending non-expired invites", async () => {
      const tokenHash = computeHMAC("test-token");
      const inviteId = randomUUID();

      await connection`
        INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at)
        VALUES (
          ${inviteId},
          ${businessId},
          'pending@test.com',
          'member',
          ${tokenHash},
          CURRENT_TIMESTAMP + INTERVAL '7 days'
        )
      `;

      const invites = await getPendingInvites(businessId);

      expect(invites).toHaveLength(1);
      expect(invites[0].email).toBe("pending@test.com");
      expect(invites[0].role).toBe("member");
      expect(invites[0].accepted_at).toBeNull();
    });

    it("should not return expired invites", async () => {
      const tokenHash = computeHMAC("expired-token");

      await connection`
        INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at)
        VALUES (
          gen_random_uuid(),
          ${businessId},
          'expired@test.com',
          'member',
          ${tokenHash},
          CURRENT_TIMESTAMP - INTERVAL '1 day'
        )
      `;

      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(0);
    });

    it("should not return accepted invites", async () => {
      const tokenHash = computeHMAC("accepted-token");

      await connection`
        INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at, accepted_at)
        VALUES (
          gen_random_uuid(),
          ${businessId},
          'accepted@test.com',
          'member',
          ${tokenHash},
          CURRENT_TIMESTAMP + INTERVAL '7 days',
          CURRENT_TIMESTAMP
        )
      `;

      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(0);
    });
  });

  describe("inviteUser", () => {
    it("should create invite when called by owner", async () => {
      const result = await inviteUser(
        businessId,
        "newuser@test.com",
        "member",
        ownerUserId,
      );

      expect(result.inviteId).toBeDefined();
      expect(result.rawToken).toBeDefined();

      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(1);
      expect(invites[0].email).toBe("newuser@test.com");
    });

    it("should create invite when called by admin", async () => {
      const result = await inviteUser(
        businessId,
        "newuser@test.com",
        "member",
        adminUserId,
      );

      expect(result.inviteId).toBeDefined();
      expect(result.rawToken).toBeDefined();
    });

    it("should throw error when called by member", async () => {
      await expect(
        inviteUser(businessId, "newuser@test.com", "member", memberUserId),
      ).rejects.toThrow("Only owners and admins can invite users");
    });

    it("should throw error when trying to invite as owner", async () => {
      await expect(
        inviteUser(businessId, "newuser@test.com", "owner", ownerUserId),
      ).rejects.toThrow("Cannot invite users as owner");
    });

    it("should throw error when user already exists", async () => {
      await expect(
        inviteUser(businessId, "admin@test.com", "member", ownerUserId),
      ).rejects.toThrow("User with this email already exists");
    });

    it("should throw error when pending invite exists", async () => {
      await inviteUser(businessId, "newuser@test.com", "member", ownerUserId);

      await expect(
        inviteUser(businessId, "newuser@test.com", "member", ownerUserId),
      ).rejects.toThrow("Pending invite already exists for this email");
    });

    it("should normalize email to lowercase", async () => {
      await inviteUser(businessId, "NewUser@Test.COM", "member", ownerUserId);

      const invites = await getPendingInvites(businessId);
      expect(invites[0].email).toBe("newuser@test.com");
    });
  });

  describe("acceptInvite", () => {
    it("should create user and mark invite as accepted", async () => {
      const { rawToken } = await inviteUser(
        businessId,
        "invited@test.com",
        "member",
        ownerUserId,
      );

      const user = await acceptInvite(rawToken, "Invited", "User");

      expect(user.email).toBe("invited@test.com");
      expect(user.first_name).toBe("Invited");
      expect(user.last_name).toBe("User");
      expect(user.business_id).toBe(businessId);

      // Verify invite is marked as accepted
      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(0);
    });

    it("should throw error for invalid token", async () => {
      await expect(
        acceptInvite("invalid-token", "Test", "User"),
      ).rejects.toThrow("Invalid or expired invite");
    });

    it("should throw error if user already exists", async () => {
      const { rawToken } = await inviteUser(
        businessId,
        "invited@test.com",
        "member",
        ownerUserId,
      );

      // Create user manually
      await connection`
        INSERT INTO users (id, email, business_id)
        VALUES (gen_random_uuid(), 'invited@test.com', ${businessId})
      `;

      await expect(acceptInvite(rawToken, "Test", "User")).rejects.toThrow(
        "User with this email already exists",
      );
    });
  });

  describe("updateMemberRole", () => {
    it("should allow owner to change member role", async () => {
      await updateMemberRole(memberUserId, businessId, "admin", ownerUserId);

      const role = await getUserRole(memberUserId);
      expect(role).toBe("admin");
    });

    it("should allow admin to change member role", async () => {
      await updateMemberRole(memberUserId, businessId, "admin", adminUserId);

      const role = await getUserRole(memberUserId);
      expect(role).toBe("admin");
    });

    it("should throw error when member tries to change role", async () => {
      await expect(
        updateMemberRole(adminUserId, businessId, "member", memberUserId),
      ).rejects.toThrow("Only owners and admins can change roles");
    });

    it("should throw error when trying to change owner role", async () => {
      await expect(
        updateMemberRole(ownerUserId, businessId, "admin", ownerUserId),
      ).rejects.toThrow("Cannot change owner role");
    });

    it("should throw error when trying to promote to owner", async () => {
      await expect(
        updateMemberRole(memberUserId, businessId, "owner", ownerUserId),
      ).rejects.toThrow("Cannot promote user to owner");
    });

    it("should throw error when user not in business", async () => {
      const otherBusinessId = await createTestBusiness(connection);

      await expect(
        updateMemberRole(memberUserId, otherBusinessId, "admin", ownerUserId),
      ).rejects.toThrow("User does not belong to this business");
    });
  });

  describe("removeMember", () => {
    it("should allow owner to remove member", async () => {
      await removeMember(memberUserId, businessId, ownerUserId);

      const members = await getBusinessMembers(businessId);
      expect(members).toHaveLength(2);
      expect(members.find((m) => m.id === memberUserId)).toBeUndefined();
    });

    it("should allow admin to remove member", async () => {
      await removeMember(memberUserId, businessId, adminUserId);

      const members = await getBusinessMembers(businessId);
      expect(members).toHaveLength(2);
    });

    it("should throw error when member tries to remove", async () => {
      await expect(
        removeMember(adminUserId, businessId, memberUserId),
      ).rejects.toThrow("Only owners and admins can remove members");
    });

    it("should throw error when trying to remove owner", async () => {
      await expect(
        removeMember(ownerUserId, businessId, ownerUserId),
      ).rejects.toThrow("Cannot delete owner");
    });

    it("should throw error when user not in business", async () => {
      const otherBusinessId = await createTestBusiness(connection);

      await expect(
        removeMember(memberUserId, otherBusinessId, ownerUserId),
      ).rejects.toThrow("User does not belong to this business");
    });
  });

  describe("revokeInvite", () => {
    it("should allow owner to revoke invite", async () => {
      const { inviteId } = await inviteUser(
        businessId,
        "revoke@test.com",
        "member",
        ownerUserId,
      );

      await revokeInvite(inviteId, businessId, ownerUserId);

      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(0);
    });

    it("should allow admin to revoke invite", async () => {
      const { inviteId } = await inviteUser(
        businessId,
        "revoke@test.com",
        "member",
        ownerUserId,
      );

      await revokeInvite(inviteId, businessId, adminUserId);

      const invites = await getPendingInvites(businessId);
      expect(invites).toHaveLength(0);
    });

    it("should throw error when member tries to revoke", async () => {
      const { inviteId } = await inviteUser(
        businessId,
        "revoke@test.com",
        "member",
        ownerUserId,
      );

      await expect(
        revokeInvite(inviteId, businessId, memberUserId),
      ).rejects.toThrow("Only owners and admins can revoke invites");
    });

    it("should throw error for non-existent invite", async () => {
      await expect(
        revokeInvite(randomUUID(), businessId, ownerUserId),
      ).rejects.toThrow("Invite not found");
    });

    it("should throw error when invite not in business", async () => {
      const { inviteId } = await inviteUser(
        businessId,
        "revoke@test.com",
        "member",
        ownerUserId,
      );
      const otherBusinessId = await createTestBusiness(connection);

      await expect(
        revokeInvite(inviteId, otherBusinessId, ownerUserId),
      ).rejects.toThrow("Invite does not belong to this business");
    });
  });

  describe("getUserRole", () => {
    it("should return user role", async () => {
      const role = await getUserRole(ownerUserId);
      expect(role).toBe("owner");
    });

    it("should return null for non-existent user", async () => {
      const role = await getUserRole(randomUUID());
      expect(role).toBeNull();
    });
  });

  describe("getInviteByToken", () => {
    it("should return invite for valid token", async () => {
      const { rawToken } = await inviteUser(
        businessId,
        "token@test.com",
        "member",
        ownerUserId,
      );

      const invite = await getInviteByToken(rawToken);

      expect(invite).not.toBeNull();
      expect(invite?.email).toBe("token@test.com");
      expect(invite?.role).toBe("member");
    });

    it("should return null for invalid token", async () => {
      const invite = await getInviteByToken("invalid-token");
      expect(invite).toBeNull();
    });

    it("should return null for expired invite", async () => {
      const { rawToken } = await inviteUser(
        businessId,
        "expired@test.com",
        "member",
        ownerUserId,
      );

      // Manually expire the invite
      const tokenHash = computeHMAC(rawToken);
      await connection`
        UPDATE business_invites
        SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
        WHERE token_hash = ${tokenHash}
      `;

      const invite = await getInviteByToken(rawToken);
      expect(invite).toBeNull();
    });
  });
});
