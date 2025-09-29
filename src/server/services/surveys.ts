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
  title: string;
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

export interface SurveyResponse {
  id: string;
  responded_at: Date;
  comment: string | null;
  score: number;
  subject_id: string;
}

interface SurveyStatsRow {
  survey_id: string;
  response_count: string;
  comment_count: string;
  average_nps: string | null;
  unique_subjects_count: string;
  respondents_count: string;
}

export interface SurveyStats {
  survey_id: string;
  response_count: number;
  comment_count: number;
  average_nps: number | null;
  unique_subjects_count: number;
  response_rate: number | null;
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
  options: { title: string; description?: string; ttl_days?: number },
): Promise<Survey> => {
  const id = randomUUID();
  const title = options.title;
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
  // Check if links already exist for this subject
  const existingLinks = await db`
    SELECT COUNT(*) as count 
    FROM survey_links 
    WHERE survey_id = ${survey.id} AND subject_id = ${request.subject_id}
    LIMIT 1
  `;

  if (Number(existingLinks[0].count) > 0) {
    throw new Error("Links already exist for this subject");
  }

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
 * Find survey link with survey and business details for webhook queueing
 */
export const findSurveyLinkWithDetails = async (
  token: string,
): Promise<{
  surveyLink: SurveyLink;
  survey: Survey;
} | null> => {
  const result = await db`
    SELECT 
      sl.id as link_id, sl.token, sl.survey_id as link_survey_id, 
      sl.subject_id, sl.score, sl.expires_at, sl.created_at as link_created_at,
      s.id as survey_id, s.business_id, s.survey_id as survey_name, 
      s.title, s.description, s.ttl_days, s.created_at as survey_created_at
    FROM survey_links sl
    JOIN surveys s ON sl.survey_id = s.id
    WHERE sl.token = ${token}
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0] as {
    link_id: string;
    token: string;
    link_survey_id: string;
    subject_id: string;
    score: number;
    expires_at: Date;
    link_created_at: Date;
    survey_id: string;
    business_id: string;
    survey_name: string;
    title: string;
    description: string | null;
    ttl_days: number;
    survey_created_at: Date;
  };

  // Check if link has expired
  if (new Date() > row.expires_at) {
    return null;
  }

  const surveyLink: SurveyLink = {
    id: row.link_id,
    token: row.token,
    survey_id: row.link_survey_id,
    subject_id: row.subject_id,
    score: row.score,
    expires_at: row.expires_at,
    created_at: row.link_created_at,
  };

  const survey: Survey = {
    id: row.survey_id,
    business_id: row.business_id,
    survey_id: row.survey_name,
    title: row.title,
    description: row.description,
    ttl_days: row.ttl_days,
    created_at: row.survey_created_at,
  };

  return { surveyLink, survey };
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

/**
 * Get all responses for a survey with response details
 */
export const getSurveyResponses = async (
  surveyId: string,
): Promise<SurveyResponse[]> => {
  const result = await db`
    SELECT 
      r.id,
      r.responded_at,
      r.comment,
      sl.score,
      sl.subject_id
    FROM responses r
    JOIN survey_links sl ON r.survey_link_id = sl.id
    WHERE sl.survey_id = ${surveyId}
    ORDER BY r.responded_at DESC
  `;

  return result as SurveyResponse[];
};

/**
 * Get aggregated statistics for all surveys for a business
 */
export const getSurveyStats = async (
  businessId: string,
): Promise<SurveyStats[]> => {
  const result = await db`
    SELECT 
      s.id as survey_id,
      COUNT(r.id) as response_count,
      COUNT(CASE WHEN r.comment IS NOT NULL AND r.comment != '' THEN 1 END) as comment_count,
      ROUND(AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END), 1) as average_nps,
      COUNT(DISTINCT sl.subject_id) as unique_subjects_count,
      COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN sl.subject_id END) as respondents_count
    FROM surveys s
    LEFT JOIN survey_links sl ON s.id = sl.survey_id
    LEFT JOIN responses r ON sl.id = r.survey_link_id
    WHERE s.business_id = ${businessId}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  return result.map((row: SurveyStatsRow) => {
    const uniqueSubjectsCount = Number(row.unique_subjects_count) || 0;
    const respondentsCount = Number(row.respondents_count) || 0;
    const responseRate =
      uniqueSubjectsCount > 0
        ? Math.round((respondentsCount / uniqueSubjectsCount) * 100)
        : null;

    return {
      survey_id: row.survey_id,
      response_count: Number(row.response_count) || 0,
      comment_count: Number(row.comment_count) || 0,
      average_nps: row.average_nps ? Number(row.average_nps) : null,
      unique_subjects_count: uniqueSubjectsCount,
      response_rate: responseRate,
    };
  }) as SurveyStats[];
};
