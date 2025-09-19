import { randomUUID } from "node:crypto";
import { generateSecureToken } from "../utils/crypto";
import {
  type DatabaseMutationResult,
  hasAffectedRows,
} from "../utils/database";
import { db } from "./database";

export interface Survey {
  id: string;
  business_id: string;
  survey_id: string;
  title: string | null;
  description: string | null;
  ttl_days: number;
  created_at: Date;
}

export interface SurveyLink {
  id: string;
  token: string;
  survey_id: string;
  subject_id: string;
  score: number;
  expires_at: Date;
  created_at: Date;
}

export interface MintLinksRequest {
  subject_id: string;
  ttl_days?: number; // Optional, defaults to 30
  redirect_url?: string; // Optional, for later use
}

export interface MintLinksResponse {
  links: Record<string, string>; // score -> URL mapping
  expires_at: string;
}

/**
 * Find an existing survey by business and survey_id
 */
export const findSurvey = async (
  businessId: string,
  surveyId: string,
): Promise<Survey | null> => {
  const result = await db`
    SELECT id, business_id, survey_id, title, description, ttl_days, created_at
    FROM surveys 
    WHERE business_id = ${businessId} AND survey_id = ${surveyId}
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as Survey;
};

/**
 * List all surveys for a business
 */
export const listSurveys = async (businessId: string): Promise<Survey[]> => {
  const result = await db`
    SELECT id, business_id, survey_id, title, description, ttl_days, created_at
    FROM surveys 
    WHERE business_id = ${businessId}
    ORDER BY created_at DESC
  `;

  return result as Survey[];
};

/**
 * Create a new survey
 */
export const createSurvey = async (
  businessId: string,
  surveyId: string,
  options?: { title?: string; description?: string; ttl_days?: number },
): Promise<Survey> => {
  const id = randomUUID();
  const title = options?.title || null;
  const description = options?.description || null;
  const ttlDays = options?.ttl_days || 30;

  const result = await db`
    INSERT INTO surveys (id, business_id, survey_id, title, description, ttl_days)
    VALUES (${id}, ${businessId}, ${surveyId}, ${title}, ${description}, ${ttlDays})
    RETURNING id, business_id, survey_id, title, description, ttl_days, created_at
  `;

  return result[0] as Survey;
};

/**
 * Generate unique survey links for all NPS scores (0-10)
 * Each link has a unique token and corresponds to one score
 */
export const mintSurveyLinks = async (
  survey: Survey,
  request: MintLinksRequest,
): Promise<MintLinksResponse> => {
  const ttlDays = request.ttl_days || survey.ttl_days;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  // Generate 11 unique tokens for scores 0-10
  const links: Record<string, string> = {};
  const linkInserts: Array<{
    id: string;
    token: string;
    survey_id: string;
    subject_id: string;
    score: number;
    expires_at: Date;
  }> = [];

  for (let score = 0; score <= 10; score++) {
    const token = generateSecureToken(32);
    links[score.toString()] =
      `${process.env.BASE_URL || "http://localhost:3000"}/r/${token}`;

    linkInserts.push({
      id: randomUUID(),
      token,
      survey_id: survey.id,
      subject_id: request.subject_id,
      score,
      expires_at: expiresAt,
    });
  }

  // Insert all links in a transaction for atomicity
  await db.begin(async (tx) => {
    for (const link of linkInserts) {
      await tx`
        INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
        VALUES (${link.id}, ${link.token}, ${link.survey_id}, ${link.subject_id}, ${link.score}, ${link.expires_at})
      `;
    }
  });

  return {
    links,
    expires_at: expiresAt.toISOString(),
  };
};

/**
 * Find a survey link by token
 */
export const findSurveyLinkByToken = async (
  token: string,
): Promise<SurveyLink | null> => {
  const result = await db`
    SELECT id, token, survey_id, subject_id, score, expires_at, created_at
    FROM survey_links
    WHERE token = ${token}
  `;

  if (result.length === 0) {
    return null;
  }

  const link = result[0] as SurveyLink;

  // Check if link has expired
  if (new Date() > link.expires_at) {
    return null;
  }

  return link;
};

/**
 * Check if a response already exists for this survey link
 * Used for deduplication
 */
export const hasExistingResponse = async (
  surveyLinkId: string,
): Promise<boolean> => {
  const result = await db`
    SELECT id FROM responses
    WHERE survey_link_id = ${surveyLinkId}
    LIMIT 1
  `;

  return result.length > 0;
};

/**
 * Check if a response already exists for any link in this survey for the same subject
 * Prevents multiple responses from the same user across different score links
 */
export const hasExistingResponseForSurvey = async (
  surveyId: string,
  subjectId: string,
): Promise<boolean> => {
  const result = await db`
    SELECT r.id 
    FROM responses r
    JOIN survey_links sl ON r.survey_link_id = sl.id
    WHERE sl.survey_id = ${surveyId} AND sl.subject_id = ${subjectId}
    LIMIT 1
  `;

  return result.length > 0;
};

/**
 * Record a response for a survey link
 */
export const recordResponse = async (
  surveyLinkId: string,
  comment?: string,
): Promise<string> => {
  const id = randomUUID();

  await db`
    INSERT INTO responses (id, survey_link_id, comment)
    VALUES (${id}, ${surveyLinkId}, ${comment || null})
  `;

  return id;
};

/**
 * Update an existing response with a comment
 */
export const updateResponseComment = async (
  surveyLinkId: string,
  comment: string,
): Promise<boolean> => {
  const result = (await db`
    UPDATE responses
    SET comment = ${comment}
    WHERE survey_link_id = ${surveyLinkId}
  `) as DatabaseMutationResult;

  return hasAffectedRows(result);
};
