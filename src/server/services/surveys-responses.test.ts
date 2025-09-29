import { afterAll, beforeEach, describe, expect, it } from "bun:test";
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
  mintSurveyLinks,
  recordResponse,
} from "./surveys";

// Helper function from original test file
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
});
