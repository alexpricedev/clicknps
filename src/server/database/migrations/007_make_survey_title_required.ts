/**
 * Make survey title field NOT NULL and enforce lowercase survey_id
 * This ensures database-level consistency with application validation
 */
import type { SQL } from "bun";

export const up = async (db: SQL): Promise<void> => {
  // First, update any existing surveys that have NULL titles to have a default title
  await db`
    UPDATE surveys 
    SET title = 'Untitled Survey' 
    WHERE title IS NULL
  `;

  // Convert any existing survey_id values to lowercase
  await db`
    UPDATE surveys 
    SET survey_id = LOWER(survey_id)
    WHERE survey_id != LOWER(survey_id)
  `;

  // Then alter the title column to be NOT NULL
  await db`
    ALTER TABLE surveys 
    ALTER COLUMN title SET NOT NULL
  `;

  // Add a check constraint to ensure survey_id is always lowercase
  await db`
    ALTER TABLE surveys
    ADD CONSTRAINT surveys_survey_id_lowercase 
    CHECK (survey_id = LOWER(survey_id))
  `;
};

export const down = async (db: SQL): Promise<void> => {
  // Remove the lowercase constraint
  await db`
    ALTER TABLE surveys
    DROP CONSTRAINT IF EXISTS surveys_survey_id_lowercase
  `;

  // Revert the column to allow NULL values
  await db`
    ALTER TABLE surveys 
    ALTER COLUMN title DROP NOT NULL
  `;
};
