/**
 * Add NPS core tables for survey links and responses
 * Creates api_keys, surveys, survey_links, and responses tables
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // Create api_keys table for business API authentication
  await db`
    CREATE TABLE api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      last_used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create surveys table to track survey configurations
  await db`
    CREATE TABLE surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      survey_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NULL,
      description TEXT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business_id, survey_id)
    )
  `;

  // Create survey_links table for individual score links
  await db`
    CREATE TABLE survey_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT NOT NULL UNIQUE,
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      subject_id VARCHAR(255) NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create responses table to track clicks and comments
  await db`
    CREATE TABLE responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_link_id UUID NOT NULL REFERENCES survey_links(id) ON DELETE CASCADE,
      responded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      comment TEXT NULL
    )
  `;

  // Add indexes for performance
  await db`CREATE INDEX idx_api_keys_business_id ON api_keys(business_id)`;
  await db`CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash)`;
  await db`CREATE INDEX idx_surveys_business_id ON surveys(business_id)`;
  await db`CREATE INDEX idx_surveys_survey_id ON surveys(business_id, survey_id)`;
  await db`CREATE INDEX idx_surveys_title ON surveys(title)`;
  await db`CREATE INDEX idx_survey_links_token ON survey_links(token)`;
  await db`CREATE INDEX idx_survey_links_survey_id ON survey_links(survey_id)`;
  await db`CREATE INDEX idx_survey_links_expires_at ON survey_links(expires_at)`;
  await db`CREATE INDEX idx_responses_survey_link_id ON responses(survey_link_id)`;
  await db`CREATE INDEX idx_responses_responded_at ON responses(responded_at)`;
};

export const down = async (db: SQL): Promise<void> => {
  // Drop tables in reverse order due to foreign key constraints
  await db`DROP TABLE IF EXISTS responses`;
  await db`DROP TABLE IF EXISTS survey_links`;
  await db`DROP TABLE IF EXISTS surveys`;
  await db`DROP TABLE IF EXISTS api_keys`;
};
