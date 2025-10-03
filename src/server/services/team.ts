import { randomUUID } from "node:crypto";
import { computeHMAC, generateSecureToken } from "../utils/crypto";
import type { User } from "./auth";
import { db } from "./database";

export type UserRole = "owner" | "admin" | "member";

export interface BusinessMember extends User {
  role: UserRole;
}

export interface BusinessInvite {
  id: string;
  business_id: string;
  email: string;
  role: UserRole;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
}

export const getBusinessMembers = async (
  businessId: string,
): Promise<BusinessMember[]> => {
  const result = await db`
    SELECT id, email, business_id, first_name, last_name, role, created_at
    FROM users
    WHERE business_id = ${businessId}
    ORDER BY
      CASE role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'member' THEN 3
      END,
      created_at ASC
  `;

  return result.map(
    (row: {
      id: string;
      email: string;
      business_id: string;
      first_name: string | null;
      last_name: string | null;
      role: UserRole;
      created_at: string;
    }) => ({
      id: row.id,
      email: row.email,
      business_id: row.business_id,
      first_name: row.first_name ?? undefined,
      last_name: row.last_name ?? undefined,
      role: row.role,
      created_at: new Date(row.created_at),
    }),
  );
};

export const getPendingInvites = async (
  businessId: string,
): Promise<BusinessInvite[]> => {
  const result = await db`
    SELECT id, business_id, email, role, expires_at, created_at, accepted_at
    FROM business_invites
    WHERE business_id = ${businessId}
      AND accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
  `;

  return result.map(
    (row: {
      id: string;
      business_id: string;
      email: string;
      role: UserRole;
      expires_at: string;
      created_at: string;
      accepted_at: string | null;
    }) => ({
      id: row.id,
      business_id: row.business_id,
      email: row.email,
      role: row.role,
      expires_at: new Date(row.expires_at),
      created_at: new Date(row.created_at),
      accepted_at: row.accepted_at ? new Date(row.accepted_at) : null,
    }),
  );
};

export const inviteUser = async (
  businessId: string,
  email: string,
  role: UserRole,
  invitedByUserId: string,
): Promise<{ inviteId: string; rawToken: string }> => {
  const normalizedEmail = email.toLowerCase().trim();

  const inviterResult = await db`
    SELECT role FROM users WHERE id = ${invitedByUserId}
  `;

  if (inviterResult.length === 0) {
    throw new Error("Inviter not found");
  }

  const inviterRole = inviterResult[0].role as UserRole;

  if (inviterRole !== "owner" && inviterRole !== "admin") {
    throw new Error("Only owners and admins can invite users");
  }

  if (role === "owner") {
    throw new Error("Cannot invite users as owner");
  }

  const existingUser = await db`
    SELECT id FROM users WHERE email = ${normalizedEmail}
  `;

  if (existingUser.length > 0) {
    throw new Error("User with this email already exists");
  }

  const existingInvite = await db`
    SELECT id FROM business_invites
    WHERE business_id = ${businessId}
      AND email = ${normalizedEmail}
      AND accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
  `;

  if (existingInvite.length > 0) {
    throw new Error("Pending invite already exists for this email");
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = computeHMAC(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inviteId = randomUUID();

  await db`
    INSERT INTO business_invites (id, business_id, email, role, token_hash, expires_at)
    VALUES (${inviteId}, ${businessId}, ${normalizedEmail}, ${role}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  return { inviteId, rawToken };
};

export const acceptInvite = async (
  rawToken: string,
  firstName: string,
  lastName: string,
): Promise<User> => {
  const tokenHash = computeHMAC(rawToken);

  const inviteResult = await db`
    SELECT id, business_id, email, role, expires_at, accepted_at
    FROM business_invites
    WHERE token_hash = ${tokenHash}
      AND accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
  `;

  if (inviteResult.length === 0) {
    throw new Error("Invalid or expired invite");
  }

  const invite = inviteResult[0] as {
    id: string;
    business_id: string;
    email: string;
    role: UserRole;
    expires_at: string;
    accepted_at: string | null;
  };

  const existingUser = await db`
    SELECT id FROM users WHERE email = ${invite.email}
  `;

  if (existingUser.length > 0) {
    throw new Error("User with this email already exists");
  }

  const userId = randomUUID();
  const userResult = await db`
    INSERT INTO users (id, email, business_id, first_name, last_name, role)
    VALUES (
      ${userId},
      ${invite.email},
      ${invite.business_id},
      ${firstName},
      ${lastName},
      ${invite.role}
    )
    RETURNING id, email, business_id, first_name, last_name, created_at
  `;

  await db`
    UPDATE business_invites
    SET accepted_at = CURRENT_TIMESTAMP
    WHERE id = ${invite.id}
  `;

  const user = userResult[0] as {
    id: string;
    email: string;
    business_id: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  };

  return {
    id: user.id,
    email: user.email,
    business_id: user.business_id,
    first_name: user.first_name ?? undefined,
    last_name: user.last_name ?? undefined,
    created_at: new Date(user.created_at),
  };
};

export const updateMemberRole = async (
  userId: string,
  businessId: string,
  newRole: UserRole,
  changedByUserId: string,
): Promise<void> => {
  const changerResult = await db`
    SELECT role FROM users WHERE id = ${changedByUserId}
  `;

  if (changerResult.length === 0) {
    throw new Error("User not found");
  }

  const changerRole = changerResult[0].role as UserRole;

  if (changerRole !== "owner" && changerRole !== "admin") {
    throw new Error("Only owners and admins can change roles");
  }

  const targetUserResult = await db`
    SELECT role, business_id FROM users WHERE id = ${userId}
  `;

  if (targetUserResult.length === 0) {
    throw new Error("Target user not found");
  }

  const targetUser = targetUserResult[0] as {
    role: UserRole;
    business_id: string;
  };

  if (targetUser.business_id !== businessId) {
    throw new Error("User does not belong to this business");
  }

  if (targetUser.role === "owner") {
    throw new Error("Cannot change owner role");
  }

  if (newRole === "owner") {
    throw new Error("Cannot promote user to owner");
  }

  await db`
    UPDATE users
    SET role = ${newRole}
    WHERE id = ${userId}
  `;
};

export const removeMember = async (
  userId: string,
  businessId: string,
  deletedByUserId: string,
): Promise<void> => {
  const deleterResult = await db`
    SELECT role FROM users WHERE id = ${deletedByUserId}
  `;

  if (deleterResult.length === 0) {
    throw new Error("User not found");
  }

  const deleterRole = deleterResult[0].role as UserRole;

  if (deleterRole !== "owner" && deleterRole !== "admin") {
    throw new Error("Only owners and admins can remove members");
  }

  const targetUserResult = await db`
    SELECT role, business_id FROM users WHERE id = ${userId}
  `;

  if (targetUserResult.length === 0) {
    throw new Error("Target user not found");
  }

  const targetUser = targetUserResult[0] as {
    role: UserRole;
    business_id: string;
  };

  if (targetUser.business_id !== businessId) {
    throw new Error("User does not belong to this business");
  }

  if (targetUser.role === "owner") {
    throw new Error("Cannot delete owner");
  }

  await db`
    DELETE FROM users
    WHERE id = ${userId}
  `;
};

export const revokeInvite = async (
  inviteId: string,
  businessId: string,
  revokedByUserId: string,
): Promise<void> => {
  const revokerResult = await db`
    SELECT role FROM users WHERE id = ${revokedByUserId}
  `;

  if (revokerResult.length === 0) {
    throw new Error("User not found");
  }

  const revokerRole = revokerResult[0].role as UserRole;

  if (revokerRole !== "owner" && revokerRole !== "admin") {
    throw new Error("Only owners and admins can revoke invites");
  }

  const inviteResult = await db`
    SELECT business_id FROM business_invites
    WHERE id = ${inviteId}
  `;

  if (inviteResult.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteResult[0] as { business_id: string };

  if (invite.business_id !== businessId) {
    throw new Error("Invite does not belong to this business");
  }

  await db`
    DELETE FROM business_invites
    WHERE id = ${inviteId}
  `;
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  const result = await db`
    SELECT role FROM users WHERE id = ${userId}
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0].role as UserRole;
};

export const getInviteByToken = async (
  rawToken: string,
): Promise<BusinessInvite | null> => {
  const tokenHash = computeHMAC(rawToken);

  const result = await db`
    SELECT id, business_id, email, role, expires_at, created_at, accepted_at
    FROM business_invites
    WHERE token_hash = ${tokenHash}
      AND accepted_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0] as {
    id: string;
    business_id: string;
    email: string;
    role: UserRole;
    expires_at: string;
    created_at: string;
    accepted_at: string | null;
  };

  return {
    id: row.id,
    business_id: row.business_id,
    email: row.email,
    role: row.role,
    expires_at: new Date(row.expires_at),
    created_at: new Date(row.created_at),
    accepted_at: row.accepted_at ? new Date(row.accepted_at) : null,
  };
};
