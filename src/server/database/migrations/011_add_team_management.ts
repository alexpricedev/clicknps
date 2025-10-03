/**
 * Add team management with roles and invites
 * - Adds role column to users table with enum type
 * - Backfills first user per business as owner
 * - Creates business_invites table for email invitations
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member')
  `;

  await db`
    ALTER TABLE users
    ADD COLUMN role user_role NOT NULL DEFAULT 'member'
  `;

  await db`
    WITH first_users AS (
      SELECT DISTINCT ON (business_id) id, business_id
      FROM users
      ORDER BY business_id, created_at ASC
    )
    UPDATE users
    SET role = 'owner'
    WHERE id IN (SELECT id FROM first_users)
  `;

  await db`
    CREATE TABLE business_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role user_role NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMPTZ NULL
    )
  `;

  await db`CREATE INDEX idx_business_invites_business_id ON business_invites(business_id)`;
  await db`CREATE INDEX idx_business_invites_token_hash ON business_invites(token_hash)`;
  await db`CREATE INDEX idx_business_invites_email ON business_invites(email)`;
  await db`CREATE INDEX idx_business_invites_expires_at ON business_invites(expires_at)`;
};

export const down = async (db: SQL): Promise<void> => {
  await db`DROP TABLE IF EXISTS business_invites`;

  await db`
    ALTER TABLE users
    DROP COLUMN IF EXISTS role
  `;

  await db`DROP TYPE IF EXISTS user_role`;
};
