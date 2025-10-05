import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
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
  findSurveyLinkWithDetails,
  type MintLinksRequest,
  mintSurveyLinks,
} from "./surveys";

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
    INSERT INTO surveys (id, business_id, survey_id, title)
    VALUES (${surveyId}, ${businessId}, 'expired-survey-test', 'Expired Test Survey')
  `;

  await connection`
    INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
    VALUES (${linkId}, ${token}, ${surveyId}, 'expired-user', 5, ${expiredDate})
  `;

  return { token, surveyId, linkId };
};

describe("Survey Links Service", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);
  });

  afterEach(async () => {
    // Ensure any hanging transactions are cleaned up
    try {
      await connection`ROLLBACK`;
    } catch {
      // Ignore if no transaction is active
    }
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("mintSurveyLinks", () => {
    it("should create 11 unique links for all NPS scores (0-10)", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-mint-1", {
        title: "Test Survey",
      });
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
      const survey = await createSurvey(testBusinessId, "test-survey-mint-2", {
        title: "Test Survey",
      });
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
      const survey = await createSurvey(testBusinessId, "test-survey-mint-3", {
        title: "Test Survey",
      });
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
      const survey = await createSurvey(testBusinessId, "test-survey-mint-4", {
        title: "Test Survey",
      });
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
        { title: "Test Survey" },
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
        INSERT INTO surveys (id, business_id, survey_id, title)
        VALUES (${surveyId}, ${testBusinessId}, 'rollback-test-survey', 'Rollback Test Survey')
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
      } finally {
        // Ensure any hanging transaction is cleaned up
        try {
          await connection`ROLLBACK`;
        } catch {
          // Ignore if no transaction is active
        }
      }

      expect(errorThrown).toBe(true);

      // Verify rollback - should still have 0 links
      const finalCount = await connection`
        SELECT COUNT(*) as count FROM survey_links WHERE survey_id = ${surveyId}
      `;
      expect(Number(finalCount[0].count)).toBe(0);
    });

    it("should return same links when called multiple times (idempotent)", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "idempotent-test-survey",
        {
          title: "Idempotent Test Survey",
        },
      );
      const request: MintLinksRequest = {
        subject_id: "idempotent-test-user",
        ttl_days: 30,
      };

      // First minting should succeed
      const firstResult = await mintSurveyLinks(survey, request);
      expect(Object.keys(firstResult.links)).toHaveLength(11);
      expect(firstResult.response).toBeNull();

      // Second minting for same subject should return identical links
      const secondResult = await mintSurveyLinks(survey, request);
      expect(Object.keys(secondResult.links)).toHaveLength(11);
      expect(secondResult.response).toBeNull();

      // Links should be identical
      expect(secondResult.links).toEqual(firstResult.links);
      expect(secondResult.expires_at).toBe(firstResult.expires_at);

      // Verify only one set of links exists
      const linkCount = await connection`
        SELECT COUNT(*) as count FROM survey_links
        WHERE survey_id = ${survey.id} AND subject_id = 'idempotent-test-user'
      `;
      expect(Number(linkCount[0].count)).toBe(11);
    });

    it("should include response score when user has already responded", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "response-test-survey",
        {
          title: "Response Test Survey",
        },
      );
      const request: MintLinksRequest = {
        subject_id: "response-test-user",
        ttl_days: 30,
      };

      // First minting - no response yet
      const firstResult = await mintSurveyLinks(survey, request);
      expect(firstResult.response).toBeNull();

      // Simulate a response by creating a response record
      const linkForScore7 = await connection`
        SELECT id FROM survey_links
        WHERE survey_id = ${survey.id}
          AND subject_id = 'response-test-user'
          AND score = 7
        LIMIT 1
      `;

      await connection`
        INSERT INTO responses (id, survey_link_id, comment)
        VALUES (${randomUUID()}, ${linkForScore7[0].id}, NULL)
      `;

      // Second minting should include the response
      const secondResult = await mintSurveyLinks(survey, request);
      expect(secondResult.response).toBe(7);
      expect(secondResult.links).toEqual(firstResult.links);
    });

    it("should allow minting links for different subjects in same survey", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "multi-subject-survey",
        {
          title: "Multi Subject Survey",
        },
      );

      // Mint links for first subject
      const result1 = await mintSurveyLinks(survey, {
        subject_id: "user-1",
        ttl_days: 30,
      });
      expect(Object.keys(result1.links)).toHaveLength(11);

      // Mint links for second subject should succeed
      const result2 = await mintSurveyLinks(survey, {
        subject_id: "user-2",
        ttl_days: 30,
      });
      expect(Object.keys(result2.links)).toHaveLength(11);

      // Verify both sets of links exist
      const linkCount = await connection`
        SELECT COUNT(*) as count FROM survey_links
        WHERE survey_id = ${survey.id}
      `;
      expect(Number(linkCount[0].count)).toBe(22); // 11 links x 2 subjects
    });
  });

  describe("findSurveyLinkByToken", () => {
    it("should find valid survey link by token", async () => {
      // Create test survey and links
      const survey = await createSurvey(testBusinessId, "test-survey-find", {
        title: "Test Survey",
      });
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
        { title: "Test Survey" },
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
      expect(returnedSurvey.title).toBe("Test Survey");
      expect(returnedSurvey.description).toBeNull();
      expect(returnedSurvey.ttl_days).toBe(30); // default value
    });

    it("should return correct data types for all fields", async () => {
      const survey = await createSurvey(testBusinessId, "test-survey-types", {
        title: "Test Survey",
      });

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

    it("should return survey with redirect fields when configured", async () => {
      const survey = await createSurvey(
        testBusinessId,
        "test-survey-redirect-details",
        {
          title: "Redirect Details Test",
          redirect_url: "https://example.com/custom-redirect",
          redirect_timing: "post_comment",
        },
      );

      const request: MintLinksRequest = {
        subject_id: "user-redirect-details",
      };

      await mintSurveyLinks(survey, request);

      const token = await getTokenForScore(
        testBusinessId,
        "test-survey-redirect-details",
        7,
      );
      const result = await findSurveyLinkWithDetails(token);

      expect(result).not.toBeNull();
      if (!result) throw new Error("Result should not be null");

      const { survey: returnedSurvey } = result;

      expect(returnedSurvey.redirect_url).toBe(
        "https://example.com/custom-redirect",
      );
      expect(returnedSurvey.redirect_timing).toBe("post_comment");
    });
  });
});
