/**
 * Add Business entity and link Users to Businesses
 * Creates businesses table and adds business_id foreign key to users table
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // Create businesses table
  await db`
    CREATE TABLE businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Add business_id to users table (NOT NULL since every user must have a business)
  await db`
    ALTER TABLE users 
    ADD COLUMN business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
  `;

  // Add indexes for performance
  await db`CREATE INDEX idx_users_business_id ON users(business_id)`;
  await db`CREATE INDEX idx_businesses_business_name ON businesses(business_name)`;
};

export const down = async (db: SQL): Promise<void> => {
  // Remove business_id column from users
  await db`ALTER TABLE users DROP COLUMN IF EXISTS business_id`;

  // Drop businesses table
  await db`DROP TABLE IF EXISTS businesses`;
};
