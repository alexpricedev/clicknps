/**
 * Add unique constraint to survey_links to prevent duplicate links for same subject
 * Ensures each subject can only have one set of links per survey
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // First, remove any duplicate links that already exist (keep the newest ones)
  await db`
    DELETE FROM survey_links 
    WHERE id NOT IN (
      SELECT DISTINCT ON (survey_id, subject_id, score) id
      FROM survey_links 
      ORDER BY survey_id, subject_id, score, created_at DESC
    )
  `;

  // Add unique constraint to prevent duplicate links for same subject
  await db`
    ALTER TABLE survey_links 
    ADD CONSTRAINT unique_survey_subject_score 
    UNIQUE (survey_id, subject_id, score)
  `;
};

export const down = async (db: SQL): Promise<void> => {
  // Remove the unique constraint
  await db`
    ALTER TABLE survey_links
    DROP CONSTRAINT IF EXISTS unique_survey_subject_score
  `;
};
