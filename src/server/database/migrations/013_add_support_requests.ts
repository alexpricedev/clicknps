/**
 * Add support_requests table for customer support
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  await db`
    CREATE TABLE support_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db`CREATE INDEX idx_support_requests_business_id ON support_requests(business_id)`;
  await db`CREATE INDEX idx_support_requests_user_id ON support_requests(user_id)`;
  await db`CREATE INDEX idx_support_requests_created_at ON support_requests(created_at DESC)`;
};

export const down = async (db: SQL): Promise<void> => {
  await db`DROP TABLE IF EXISTS support_requests`;
};
