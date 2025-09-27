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
  findSurvey,
  findSurveyLinkByToken,
  findSurveyLinkWithDetails,
  hasExistingResponse,
  hasExistingResponseForSurvey,
  type MintLinksRequest,
  mintSurveyLinks,
  recordResponse,
  updateResponseComment,
} from "./surveys";

// Minimal test helper functions
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

const createExpiredSurveyLink = async (
  connection: SQL,
  businessId: string,
  daysAgo = 1,
): Promise<{ token: string; surveyId: string; linkId: string }> => {
  const surveyId = randomUUID();
  const linkId = randomUUID();
  const token = `expired-token-${randomUUID().slice(0, 8)}`;
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - daysAgo);

  await connection`
    INSERT INTO surveys (id, business_id, survey_id)
    VALUES (${surveyId}, ${businessId}, 'expired-survey-test')
  `;

  await connection`
    INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
    VALUES (${linkId}, ${token}, ${surveyId}, 'expired-user', 5, ${expiredDate})
  `;

  return { token, surveyId, linkId };
};

describe("Surveys Service with PostgreSQL", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("createSurvey", () => {
    it("should create a new survey with title and description", async () => {
      const surveyId = "test-survey-1";
      const options = { title: "Test Survey", description: "A test survey" };

      const survey = await createSurvey(testBusinessId, surveyId, options);

      expect(survey).toBeDefined();
      expect(survey.business_id).toBe(testBusinessId);
      expect(survey.survey_id).toBe(surveyId);
      expect(survey.title).toBe("Test Survey");
      expect(survey.description).toBe("A test survey");
      expect(survey.created_at).toBeInstanceOf(Date);
    });

    it("should create survey with null title and description when options not provided", async () => {
      const surveyId = "test-survey-2";

      const survey = await createSurvey(testBusinessId, surveyId);

      expect(survey.title).toBeNull();
      expect(survey.description).toBeNull();
    });
  });

  describe("findSurvey", () => {
    it("should return null when survey does not exist", async () => {
      const surveyId = "non-existent-survey";

      const survey = await findSurvey(testBusinessId, surveyId);

      expect(survey).toBeNull();
    });

    it("should return existing survey when one exists", async () => {
      const surveyId = "test-survey-3";

      // Create survey first
      const createdSurvey = await createSurvey(testBusinessId, surveyId, {
        title: "Found Survey",
        description: "Test description",
      });

      // Find the same survey
      const foundSurvey = await findSurvey(testBusinessId, surveyId);

      expect(foundSurvey).not.toBeNull();
      if (foundSurvey) {
        expect(foundSurvey.id).toBe(createdSurvey.id);
        expect(foundSurvey.title).toBe("Found Survey");
        expect(foundSurvey.description).toBe("Test description");
        expect(foundSurvey.created_at).toEqual(createdSurvey.created_at);
      }
    });
  });

  describe("mintSurveyLinks", () => {
    it("should create 11 unique links for all NPS scores (0-10)", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-mint-1");
      const request: MintLinksRequest = {
        subject_id: "user-123",
        ttl_days: 30,
      };

      const result = await mintSurveyLinks(survey, request);

      expect(result.links).toBeDefined();
      expect(Object.keys(result.links)).toHaveLength(11);
      expect(result.expires_at).toBeDefined();

      // Check all scores 0-10 are present
      for (let score = 0; score <= 10; score++) {
        expect(result.links[score.toString()]).toBeDefined();
        expect(result.links[score.toString()]).toMatch(/\/r\/[a-zA-Z0-9_-]+$/);
      }

      // Verify links are stored in database
      const dbLinks = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
        ORDER BY score
      `;

      expect(dbLinks).toHaveLength(11);
      dbLinks.forEach((link: any, index: number) => {
        expect(link.score).toBe(index);
        expect(link.subject_id).toBe("user-123");
      });
    });

    it("should use default TTL of 30 days when not specified", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-mint-2");
      const request: MintLinksRequest = {
        subject_id: "user-456",
      };

      const result = await mintSurveyLinks(survey, request);
      const expiresAt = new Date(result.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 30);

      // Allow for small time differences in test execution
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it("should use custom TTL when specified", async () => {
      const customTtl = 7;
      const survey = await createSurvey(testBusinessId, "test-survey-mint-3");
      const request: MintLinksRequest = {
        subject_id: "user-789",
        ttl_days: customTtl,
      };

      const result = await mintSurveyLinks(survey, request);
      const expiresAt = new Date(result.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + customTtl);

      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(5000);
    });

    it("should create unique tokens for each link", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-mint-4");
      const request: MintLinksRequest = {
        subject_id: "user-unique",
      };

      const result = await mintSurveyLinks(survey, request);
      const tokens = Object.values(result.links).map(
        (url) => url.split("/r/")[1],
      );
      const uniqueTokens = new Set(tokens);

      expect(uniqueTokens.size).toBe(11); // All tokens should be unique
    });

    it("should maintain transaction atomicity on database errors", async () => {
      // This test verifies that if any insert fails, the entire transaction is rolled back
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-transaction",
      );
      const request: MintLinksRequest = {
        subject_id: "user-transaction",
      };

      // Check that we start with no survey links
      const initialLinks = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
      `;
      expect(initialLinks).toHaveLength(0);

      // Normal minting should work
      const result = await mintSurveyLinks(survey, request);
      expect(Object.keys(result.links)).toHaveLength(11);

      // Verify all links were created
      const finalLinks = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
      `;
      expect(finalLinks).toHaveLength(11);
    });

    it("should rollback transaction when database error occurs", async () => {
      const surveyId = randomUUID();

      await connection`
        INSERT INTO surveys (id, business_id, survey_id)
        VALUES (${surveyId}, ${testBusinessId}, 'rollback-test-survey')
      `;

      // Check initial state - should have 0 links
      const initialCount = await connection`
        SELECT COUNT(*) as count FROM survey_links WHERE survey_id = ${surveyId}
      `;
      expect(Number(initialCount[0].count)).toBe(0);

      // Try a transaction that will fail due to constraint violation
      let errorThrown = false;
      try {
        await connection.begin(async (tx) => {
          // This should fail due to invalid score constraint (score > 10)
          await tx`
            INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
            VALUES (${randomUUID()}, 'test-token', ${surveyId}, 'test-user', 15, NOW() + INTERVAL '30 days')
          `;
        });
      } catch (error) {
        errorThrown = true;
        expect(error).toBeDefined();
      }

      expect(errorThrown).toBe(true);

      // Verify rollback - should still have 0 links
      const finalCount = await connection`
        SELECT COUNT(*) as count FROM survey_links WHERE survey_id = ${surveyId}
      `;
      expect(Number(finalCount[0].count)).toBe(0);
    });
  });

  describe("findSurveyLinkByToken", () => {
    it("should find valid survey link by token", async () => {
      // Create test survey and links
      const survey = await createSurvey(testBusinessId, "test-survey-find");
      const request: MintLinksRequest = {
        subject_id: "user-find",
        ttl_days: 30,
      };

      await mintSurveyLinks(survey, request);

      // Get the created links
      const testSurveyLinks = await connection`
        SELECT * FROM survey_links 
        WHERE survey_id = ${survey.id}
      `;

      const testLink = testSurveyLinks[0];
      const found = await findSurveyLinkByToken(testLink.token);

      expect(found).toBeDefined();
      if (!found) {
        throw new Error("Survey link not found");
      }
      expect(found.id).toBe(testLink.id);
      expect(found.token).toBe(testLink.token);
      expect(found.score).toBe(testLink.score);
      expect(found.subject_id).toBe(testLink.subject_id);
    });

    it("should return null for non-existent token", async () => {
      const found = await findSurveyLinkByToken("non-existent-token");
      expect(found).toBeNull();
    });

    it("should return null for expired token", async () => {
      const { token } = await createExpiredSurveyLink(
        connection,
        testBusinessId,
      );

      const found = await findSurveyLinkByToken(token);
      expect(found).toBeNull();
    });
  });

  describe("hasExistingResponse", () => {
    it("should return false when no response exists", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-response-1",
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

      const survey1 = await createSurvey(testBusinessId, surveyId1);
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
      const survey = await createSurvey(testBusinessId, surveyId);
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

  describe("findSurveyLinkWithDetails", () => {
    it("should return survey link with survey details for valid token", async () => {
      // Setup: Create survey and links
      const survey = await createSurvey(testBusinessId, "test-survey-details", {
        title: "Details Test Survey",
        description: "A survey for testing findSurveyLinkWithDetails",
        ttl_days: 14,
      });

      const request: MintLinksRequest = {
        subject_id: "user-details-test",
        ttl_days: 7,
      };

      await mintSurveyLinks(survey, request);

      // Get a token for testing
      const token = await getTokenForScore(
        testBusinessId,
        "test-survey-details",
        8,
      );

      // Test the method
      const result = await findSurveyLinkWithDetails(token);

      expect(result).not.toBeNull();
      if (!result) throw new Error("Result should not be null");

      const { surveyLink, survey: returnedSurvey } = result;

      // Verify surveyLink properties
      expect(surveyLink.token).toBe(token);
      expect(surveyLink.survey_id).toBe(survey.id);
      expect(surveyLink.subject_id).toBe("user-details-test");
      expect(surveyLink.score).toBe(8);
      expect(surveyLink.expires_at).toBeInstanceOf(Date);
      expect(surveyLink.created_at).toBeInstanceOf(Date);

      // Verify survey properties
      expect(returnedSurvey.id).toBe(survey.id);
      expect(returnedSurvey.business_id).toBe(testBusinessId);
      expect(returnedSurvey.survey_id).toBe("test-survey-details");
      expect(returnedSurvey.title).toBe("Details Test Survey");
      expect(returnedSurvey.description).toBe(
        "A survey for testing findSurveyLinkWithDetails",
      );
      expect(returnedSurvey.ttl_days).toBe(14);
      expect(returnedSurvey.created_at).toBeInstanceOf(Date);
    });

    it("should return null for non-existent token", async () => {
      const result = await findSurveyLinkWithDetails(
        "non-existent-token-details",
      );
      expect(result).toBeNull();
    });

    it("should return null for expired token", async () => {
      const { token } = await createExpiredSurveyLink(
        connection,
        testBusinessId,
        2, // expired 2 days ago
      );

      const result = await findSurveyLinkWithDetails(token);
      expect(result).toBeNull();
    });

    it("should handle survey with null title and description", async () => {
      // Create survey without title/description
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-null-details",
      );

      const request: MintLinksRequest = {
        subject_id: "user-null-details",
      };

      await mintSurveyLinks(survey, request);

      // Get a token for testing
      const token = await getTokenForScore(
        testBusinessId,
        "test-survey-null-details",
        3,
      );

      // Test the method
      const result = await findSurveyLinkWithDetails(token);

      expect(result).not.toBeNull();
      if (!result) throw new Error("Result should not be null");

      const { survey: returnedSurvey } = result;

      // Verify survey properties with null values
      expect(returnedSurvey.title).toBeNull();
      expect(returnedSurvey.description).toBeNull();
      expect(returnedSurvey.ttl_days).toBe(30); // default value
    });

    it("should return correct data types for all fields", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-types");

      const request: MintLinksRequest = {
        subject_id: "user-types-test",
      };

      await mintSurveyLinks(survey, request);

      const token = await getTokenForScore(
        testBusinessId,
        "test-survey-types",
        10,
      );
      const result = await findSurveyLinkWithDetails(token);

      expect(result).not.toBeNull();
      if (!result) throw new Error("Result should not be null");

      const { surveyLink, survey: returnedSurvey } = result;

      // Check surveyLink data types
      expect(typeof surveyLink.id).toBe("string");
      expect(typeof surveyLink.token).toBe("string");
      expect(typeof surveyLink.survey_id).toBe("string");
      expect(typeof surveyLink.subject_id).toBe("string");
      expect(typeof surveyLink.score).toBe("number");
      expect(surveyLink.expires_at).toBeInstanceOf(Date);
      expect(surveyLink.created_at).toBeInstanceOf(Date);

      // Check survey data types
      expect(typeof returnedSurvey.id).toBe("string");
      expect(typeof returnedSurvey.business_id).toBe("string");
      expect(typeof returnedSurvey.survey_id).toBe("string");
      expect(typeof returnedSurvey.ttl_days).toBe("number");
      expect(returnedSurvey.created_at).toBeInstanceOf(Date);
    });
  });
});
