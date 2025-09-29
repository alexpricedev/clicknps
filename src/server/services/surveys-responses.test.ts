import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { cleanupTestData, createTestBusiness } from "../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

// Mock the database module to use our test connection
import { mock } from "bun:test";

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import {
  createSurvey,
  findSurveyLinkByToken,
  getSurveyResponses,
  getSurveyStats,
  hasExistingResponse,
  hasExistingResponseForSurvey,
  type MintLinksRequest,
  mintSurveyLinks,
  recordResponse,
  updateResponseComment,
} from "./surveys";

// Helper functions from original test file
const getTokenForScore = async (
  businessId: string,
  surveyId: string,
  score: number,
): Promise<string> => {
  const result = await connection`
    SELECT sl.token FROM survey_links sl
    JOIN surveys s ON sl.survey_id = s.id
    WHERE s.business_id = ${businessId} 
      AND s.survey_id = ${surveyId}
      AND sl.score = ${score}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new Error(`No token found for score ${score} in survey ${surveyId}`);
  }

  return result[0].token;
};

const getSurveyId = async (
  businessId: string,
  surveyId: string,
): Promise<string> => {
  const result = await connection`
    SELECT id FROM surveys 
    WHERE business_id = ${businessId} AND survey_id = ${surveyId}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new Error(`No survey found with ID ${surveyId}`);
  }

  return result[0].id;
};

describe("Survey Responses Service", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("getSurveyResponses", () => {
    it("should return empty array when no responses exist", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-no-responses",
        { title: "Test Survey" },
      );
      const responses = await getSurveyResponses(survey.id);

      expect(responses).toHaveLength(0);
    });

    it("should return responses with correct data and ordering", async () => {
      const surveyId = "test-survey-get-responses";
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Test Survey",
      });

      // Mint links for one subject
      await mintSurveyLinks(survey, {
        subject_id: "user-ordering",
        ttl_days: 30,
      });

      // Create responses with specific timing to test ordering
      const token1 = await getTokenForScore(testBusinessId, surveyId, 5);
      const token2 = await getTokenForScore(testBusinessId, surveyId, 8);
      const surveyLink1 = await findSurveyLinkByToken(token1);
      const surveyLink2 = await findSurveyLinkByToken(token2);

      if (!surveyLink1 || !surveyLink2)
        throw new Error("Survey links not found");

      // Record first response
      await recordResponse(surveyLink1.id, "Great service!");

      // Wait a moment to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Record second response
      await recordResponse(surveyLink2.id);

      const responses = await getSurveyResponses(survey.id);

      expect(responses).toHaveLength(2);

      // Should be ordered by responded_at DESC (newest first)
      expect(responses[0].score).toBe(8);
      expect(responses[0].comment).toBeNull();
      expect(responses[0].subject_id).toBe("user-ordering");
      expect(responses[0].responded_at).toBeInstanceOf(Date);

      expect(responses[1].score).toBe(5);
      expect(responses[1].comment).toBe("Great service!");
      expect(responses[1].subject_id).toBe("user-ordering");
      expect(responses[1].responded_at).toBeInstanceOf(Date);

      // Verify ordering (newest first)
      expect(responses[0].responded_at.getTime()).toBeGreaterThan(
        responses[1].responded_at.getTime(),
      );
    });

    it("should handle responses from multiple subjects", async () => {
      const survey1 = await createSurvey(testBusinessId, "test-survey-alpha", {
        title: "Test Survey Alpha",
      });
      const survey2 = await createSurvey(testBusinessId, "test-survey-beta", {
        title: "Test Survey Beta",
      });

      // Mint links for different subjects in different surveys
      await mintSurveyLinks(survey1, {
        subject_id: "user-alpha",
        ttl_days: 30,
      });
      await mintSurveyLinks(survey2, {
        subject_id: "user-beta",
        ttl_days: 30,
      });

      // Get tokens for different surveys and scores
      const tokenAlpha = await getTokenForScore(
        testBusinessId,
        "test-survey-alpha",
        9,
      );
      const tokenBeta = await getTokenForScore(
        testBusinessId,
        "test-survey-beta",
        3,
      );

      const surveyLinkAlpha = await findSurveyLinkByToken(tokenAlpha);
      const surveyLinkBeta = await findSurveyLinkByToken(tokenBeta);

      if (!surveyLinkAlpha || !surveyLinkBeta)
        throw new Error("Survey links not found");

      // Record responses
      await recordResponse(surveyLinkAlpha.id, "Excellent!");
      await recordResponse(surveyLinkBeta.id, "Could be better");

      const responsesAlpha = await getSurveyResponses(survey1.id);
      const responsesBeta = await getSurveyResponses(survey2.id);

      expect(responsesAlpha).toHaveLength(1);
      expect(responsesAlpha[0].score).toBe(9);
      expect(responsesAlpha[0].comment).toBe("Excellent!");
      expect(responsesAlpha[0].subject_id).toBe("user-alpha");

      expect(responsesBeta).toHaveLength(1);
      expect(responsesBeta[0].score).toBe(3);
      expect(responsesBeta[0].comment).toBe("Could be better");
      expect(responsesBeta[0].subject_id).toBe("user-beta");
    });

    it("should return responses for the correct survey only", async () => {
      // Create two different surveys
      const survey1 = await createSurvey(
        testBusinessId,
        "test-survey-isolation-1",
        { title: "Test Survey 1" },
      );
      const survey2 = await createSurvey(
        testBusinessId,
        "test-survey-isolation-2",
        { title: "Test Survey 2" },
      );

      // Mint links for both surveys
      await mintSurveyLinks(survey1, { subject_id: "user-isolation-1" });
      await mintSurveyLinks(survey2, { subject_id: "user-isolation-2" });

      // Get tokens and create responses
      const token1 = await getTokenForScore(
        testBusinessId,
        "test-survey-isolation-1",
        7,
      );
      const token2 = await getTokenForScore(
        testBusinessId,
        "test-survey-isolation-2",
        4,
      );

      const surveyLink1 = await findSurveyLinkByToken(token1);
      const surveyLink2 = await findSurveyLinkByToken(token2);

      if (!surveyLink1 || !surveyLink2)
        throw new Error("Survey links not found");

      await recordResponse(surveyLink1.id, "Survey 1 response");
      await recordResponse(surveyLink2.id, "Survey 2 response");

      // Get responses for survey1 only
      const responses1 = await getSurveyResponses(survey1.id);
      const responses2 = await getSurveyResponses(survey2.id);

      expect(responses1).toHaveLength(1);
      expect(responses1[0].score).toBe(7);
      expect(responses1[0].comment).toBe("Survey 1 response");
      expect(responses1[0].subject_id).toBe("user-isolation-1");

      expect(responses2).toHaveLength(1);
      expect(responses2[0].score).toBe(4);
      expect(responses2[0].comment).toBe("Survey 2 response");
      expect(responses2[0].subject_id).toBe("user-isolation-2");
    });
  });

  describe("hasExistingResponse", () => {
    it("should return false when no response exists", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-response-1",
        { title: "Test Survey" },
      );
      const request: MintLinksRequest = {
        subject_id: "user-response-1",
      };

      await mintSurveyLinks(survey, request);

      const links = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
        LIMIT 1
      `;
      const testSurveyLink = links[0];

      const hasResponse = await hasExistingResponse(testSurveyLink.id);
      expect(hasResponse).toBe(false);
    });

    it("should return true when response exists", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-response-2",
        { title: "Test Survey" },
      );
      const request: MintLinksRequest = {
        subject_id: "user-response-2",
      };

      await mintSurveyLinks(survey, request);

      const links = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
        LIMIT 1
      `;
      const testSurveyLink = links[0];

      // Create a response
      await recordResponse(testSurveyLink.id, "Test comment");

      const hasResponse = await hasExistingResponse(testSurveyLink.id);
      expect(hasResponse).toBe(true);
    });
  });

  describe("hasExistingResponseForSurvey", () => {
    it("should work correctly across all scenarios", async () => {
      // Test 1: Return false when no response exists
      const surveyId1 = "test-survey-multi-response-1";
      const subjectId1 = "user-multi-response-1";

      const survey1 = await createSurvey(testBusinessId, surveyId1, {
        title: "Test Survey 1",
      });
      await mintSurveyLinks(survey1, {
        subject_id: subjectId1,
        ttl_days: 30,
      });

      const dbSurveyId1 = await getSurveyId(testBusinessId, surveyId1);
      let hasResponse = await hasExistingResponseForSurvey(
        dbSurveyId1,
        subjectId1,
      );
      expect(hasResponse).toBe(false);

      // Test 2: Return true when response exists for any score link
      const token = await getTokenForScore(testBusinessId, surveyId1, 5);
      const surveyLink = await findSurveyLinkByToken(token);
      if (!surveyLink) throw new Error("Survey link not found");

      await recordResponse(surveyLink.id, "Score 5 response");
      hasResponse = await hasExistingResponseForSurvey(dbSurveyId1, subjectId1);
      expect(hasResponse).toBe(true);

      // Test 3: Verify individual link checks work as expected
      const token3 = await getTokenForScore(testBusinessId, surveyId1, 3);
      const token8 = await getTokenForScore(testBusinessId, surveyId1, 8);
      const surveyLink3 = await findSurveyLinkByToken(token3);
      const surveyLink8 = await findSurveyLinkByToken(token8);

      if (!surveyLink3 || !surveyLink8)
        throw new Error("Survey links not found");

      expect(await hasExistingResponse(surveyLink.id)).toBe(true); // The one with response
      expect(await hasExistingResponse(surveyLink3.id)).toBe(false);
      expect(await hasExistingResponse(surveyLink8.id)).toBe(false);
    });
  });

  describe("Response and Comment Management", () => {
    it("should handle complete response and comment lifecycle", async () => {
      const surveyId = "test-survey-response-lifecycle";
      const subjectId = "user-response-lifecycle";

      // Setup: mint survey links once for all tests
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Test Survey",
      });
      const mintResult = await mintSurveyLinks(survey, {
        subject_id: subjectId,
        ttl_days: 30,
      });

      expect(Object.keys(mintResult.links)).toHaveLength(11);

      // Test 1: Record response with comment
      const token1 = await getTokenForScore(testBusinessId, surveyId, 3);
      const surveyLink1 = await findSurveyLinkByToken(token1);
      if (!surveyLink1) throw new Error("Survey link not found");

      const comment = "Great service!";
      const responseId1 = await recordResponse(surveyLink1.id, comment);
      expect(responseId1).toBeDefined();

      // Verify response was saved with comment
      const responses1 = await connection`
        SELECT * FROM responses WHERE id = ${responseId1}
      `;
      expect(responses1).toHaveLength(1);
      expect(responses1[0].survey_link_id).toBe(surveyLink1.id);
      expect(responses1[0].comment).toBe(comment);

      // Test 2: Record response without comment
      const token2 = await getTokenForScore(testBusinessId, surveyId, 7);
      const surveyLink2 = await findSurveyLinkByToken(token2);
      if (!surveyLink2) throw new Error("Survey link not found");

      const responseId2 = await recordResponse(surveyLink2.id);
      expect(responseId2).toBeDefined();

      // Verify response was saved without comment
      const responses2 = await connection`
        SELECT * FROM responses WHERE id = ${responseId2}
      `;
      expect(responses2).toHaveLength(1);
      expect(responses2[0].survey_link_id).toBe(surveyLink2.id);
      expect(responses2[0].comment).toBeNull();

      // Test 3: Update response comment
      const token3 = await getTokenForScore(testBusinessId, surveyId, 6);
      const surveyLink3 = await findSurveyLinkByToken(token3);
      if (!surveyLink3) throw new Error("Survey link not found");

      // Create initial response
      const testResponseId = await recordResponse(
        surveyLink3.id,
        "Initial comment",
      );

      const newComment = "Updated comment";
      const updated = await updateResponseComment(surveyLink3.id, newComment);
      expect(updated).toBe(true);

      // Verify comment was updated
      const responses3 = await connection`
        SELECT * FROM responses WHERE id = ${testResponseId}
      `;
      expect(responses3[0].comment).toBe(newComment);

      // Test 4: Update non-existent response
      const nonExistentLinkId = randomUUID();
      const updatedNonExistent = await updateResponseComment(
        nonExistentLinkId,
        "Some comment",
      );
      expect(updatedNonExistent).toBe(false);

      // Test 5: Check response existence
      expect(await hasExistingResponse(surveyLink1.id)).toBe(true);
      expect(await hasExistingResponse(surveyLink2.id)).toBe(true);
      expect(await hasExistingResponse(surveyLink3.id)).toBe(true);

      // Test a link without response
      const token8 = await getTokenForScore(testBusinessId, surveyId, 8);
      const surveyLink8 = await findSurveyLinkByToken(token8);
      if (!surveyLink8) throw new Error("Survey link not found");
      expect(await hasExistingResponse(surveyLink8.id)).toBe(false);
    });
  });

  describe("getSurveyStats", () => {
    it("should return correct stats including response rate", async () => {
      // Create two surveys for testing
      const survey1 = await createSurvey(testBusinessId, "stats-survey-1", {
        title: "Stats Test Survey 1",
      });
      const survey2 = await createSurvey(testBusinessId, "stats-survey-2", {
        title: "Stats Test Survey 2",
      });

      // Mint links for survey1: 3 different subjects
      await mintSurveyLinks(survey1, { subject_id: "user-1" });
      await mintSurveyLinks(survey1, { subject_id: "user-2" });
      await mintSurveyLinks(survey1, { subject_id: "user-3" });

      // Mint links for survey2: 2 different subjects
      await mintSurveyLinks(survey2, { subject_id: "user-4" });
      await mintSurveyLinks(survey2, { subject_id: "user-5" });

      // Add responses for survey1: 2 out of 3 subjects respond
      // Get tokens for different subjects
      const links1 = await connection`
        SELECT token, subject_id FROM survey_links 
        WHERE survey_id = ${survey1.id} AND subject_id = 'user-1' AND score = 8
        LIMIT 1
      `;
      const links2 = await connection`
        SELECT token, subject_id FROM survey_links 
        WHERE survey_id = ${survey1.id} AND subject_id = 'user-2' AND score = 9
        LIMIT 1
      `;

      if (links1.length === 0 || links2.length === 0) {
        throw new Error("Could not find expected survey links");
      }

      const surveyLink1 = await findSurveyLinkByToken(links1[0].token);
      const surveyLink2 = await findSurveyLinkByToken(links2[0].token);

      if (!surveyLink1 || !surveyLink2) {
        throw new Error("Survey links not found");
      }

      await recordResponse(surveyLink1.id, "Great!");
      await recordResponse(surveyLink2.id); // No comment

      // Add 1 response for survey2: 1 out of 2 subjects respond
      const links3 = await connection`
        SELECT token, subject_id FROM survey_links 
        WHERE survey_id = ${survey2.id} AND subject_id = 'user-4' AND score = 5
        LIMIT 1
      `;

      if (links3.length === 0) {
        throw new Error("Could not find expected survey link for user-4");
      }

      const surveyLink3 = await findSurveyLinkByToken(links3[0].token);

      if (!surveyLink3) {
        throw new Error("Survey link not found");
      }

      await recordResponse(surveyLink3.id, "Could be better");

      // Get stats
      const stats = await getSurveyStats(testBusinessId);

      expect(stats).toHaveLength(2);

      // Find stats for each survey
      const stats1 = stats.find((s) => s.survey_id === survey1.id);
      const stats2 = stats.find((s) => s.survey_id === survey2.id);

      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();

      if (!stats1 || !stats2) {
        throw new Error("Stats not found");
      }

      // Survey 1: 2 responses from 3 subjects = 67% response rate
      expect(stats1.response_count).toBe(2);
      expect(stats1.comment_count).toBe(1);
      expect(stats1.unique_subjects_count).toBe(3);
      expect(stats1.response_rate).toBe(67);
      expect(stats1.average_nps).toBe(8.5);

      // Survey 2: 1 response from 2 subjects = 50% response rate
      expect(stats2.response_count).toBe(1);
      expect(stats2.comment_count).toBe(1);
      expect(stats2.unique_subjects_count).toBe(2);
      expect(stats2.response_rate).toBe(50);
      expect(stats2.average_nps).toBe(5.0);
    });

    it("should handle survey with no links minted", async () => {
      // Create survey with no links
      const survey = await createSurvey(testBusinessId, "empty-stats-survey", {
        title: "Empty Stats Survey",
      });

      const stats = await getSurveyStats(testBusinessId);
      const surveyStats = stats.find((s) => s.survey_id === survey.id);

      expect(surveyStats).toBeDefined();
      if (!surveyStats) throw new Error("Stats not found");

      expect(surveyStats.response_count).toBe(0);
      expect(surveyStats.comment_count).toBe(0);
      expect(surveyStats.unique_subjects_count).toBe(0);
      expect(surveyStats.response_rate).toBeNull();
      expect(surveyStats.average_nps).toBeNull();
    });
  });
});
