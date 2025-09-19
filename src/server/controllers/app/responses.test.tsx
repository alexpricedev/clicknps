import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { createBunRequest } from "../../test-utils/bun-request";
import { cleanupTestData, createTestBusiness } from "../../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

// Mock the database module to use our test connection
mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

import {
  createSurvey,
  type MintLinksRequest,
  mintSurveyLinks,
} from "../../services/surveys";
import { responsesController } from "./responses";

// Test utilities for responses controller
interface TestSurveySetup {
  businessId: string;
  surveyId: string;
  subjectId: string;
  links: Record<string, string>;
  tokens: Record<number, string>;
}

const createTestSurveySetup = async (
  businessId: string,
): Promise<TestSurveySetup> => {
  const surveyId = `test-survey-${randomUUID().slice(0, 8)}`;
  const subjectId = `test-user-${randomUUID().slice(0, 8)}`;

  const survey = await createSurvey(businessId, surveyId);
  const request: MintLinksRequest = {
    subject_id: subjectId,
    ttl_days: 30,
  };

  const mintResult = await mintSurveyLinks(survey, request);

  // Extract tokens from URLs
  const tokens: Record<number, string> = {};
  for (let score = 0; score <= 10; score++) {
    const url = mintResult.links[score.toString()];
    tokens[score] = url.split("/r/")[1];
  }

  return {
    businessId,
    surveyId,
    subjectId,
    links: mintResult.links,
    tokens,
  };
};

const createExpiredToken = async (businessId: string): Promise<string> => {
  const surveyId = randomUUID();
  const linkId = randomUUID();
  const token = `expired-${randomUUID().slice(0, 8)}`;
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1);

  await connection`
    INSERT INTO surveys (id, business_id, survey_id)
    VALUES (${surveyId}, ${businessId}, 'expired-survey')
  `;

  await connection`
    INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
    VALUES (${linkId}, ${token}, ${surveyId}, 'expired-user', 5, ${expiredDate})
  `;

  return token;
};

describe("Responses Controller", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);

    // Create fresh test business for each test
    testBusinessId = await createTestBusiness(connection);
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  describe("capture endpoint", () => {
    it("should capture NPS response and show thank you page", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[7]; // Score of 7

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      const response = await responsesController.capture(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Thank you for your feedback!");
      expect(html).toContain("7"); // Should show the score
      expect(html).not.toContain("already responded"); // First response

      // Verify response was recorded in database
      const responses = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responses).toHaveLength(1);
      expect(responses[0].comment).toBeNull();
    });

    it("should handle already responded scenario", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[8]; // Score of 8

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      // First response
      await responsesController.capture(req);

      // Second response should show already responded
      const response2 = await responsesController.capture(req);

      expect(response2.status).toBe(200);
      const html = await response2.text();
      expect(html).toContain("8"); // Should still show the score
      expect(html).toContain(
        "We&#x27;ve already recorded your response for this survey",
      ); // Should indicate already responded

      // Should still only have one response in database
      const responses = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responses).toHaveLength(1);
    });

    it("should prevent multiple responses across different score links", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token4 = setup.tokens[4]; // Score of 4
      const token7 = setup.tokens[7]; // Score of 7

      // First, click on score 4 link
      const req4 = createBunRequest(
        `http://localhost:3000/r/${token4}`,
        { method: "GET" },
        { token: token4 },
      );
      const response1 = await responsesController.capture(req4);
      expect(response1.status).toBe(200);
      const html1 = await response1.text();
      expect(html1).toContain("4"); // Should show score 4
      expect(html1).not.toContain("already recorded"); // First response

      // Now try to click on score 7 link from the same survey
      const req7 = createBunRequest(
        `http://localhost:3000/r/${token7}`,
        { method: "GET" },
        { token: token7 },
      );
      const response2 = await responsesController.capture(req7);
      expect(response2.status).toBe(200);
      const html2 = await response2.text();
      expect(html2).toContain("7"); // Should show score 7
      expect(html2).toContain(
        "We&#x27;ve already recorded your response for this survey",
      ); // Should indicate already responded

      // Should only have ONE response in database (for score 4)
      const responses = await connection`
        SELECT r.*, sl.score 
        FROM responses r
        JOIN survey_links sl ON r.survey_link_id = sl.id
        WHERE sl.survey_id IN (
          SELECT id FROM surveys 
          WHERE business_id = ${setup.businessId} 
            AND survey_id = ${setup.surveyId}
        )
      `;
      expect(responses).toHaveLength(1);
      expect(responses[0].score).toBe(4); // Should only have the first response (score 4)
    });

    it("should return 400 for missing token", async () => {
      const req = createBunRequest(
        "http://localhost:3000/r/invalid",
        { method: "GET" },
        { token: "" },
      );

      const response = await responsesController.capture(req);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid response link");
    });

    it("should return 404 for non-existent token", async () => {
      const req = createBunRequest(
        "http://localhost:3000/r/nonexistent",
        { method: "GET" },
        { token: "nonexistent" },
      );

      const response = await responsesController.capture(req);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Response link not found or expired");
    });

    it("should return 404 for expired token", async () => {
      const expiredToken = await createExpiredToken(testBusinessId);

      const req = createBunRequest(
        `http://localhost:3000/r/${expiredToken}`,
        { method: "GET" },
        { token: expiredToken },
      );

      const response = await responsesController.capture(req);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Response link not found or expired");
    });
  });

  describe("addComment endpoint", () => {
    it("should add comment to existing response", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[9]; // Score of 9

      // First capture the response
      const captureReq = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );
      await responsesController.capture(captureReq);

      // Then add a comment
      const formData = new FormData();
      formData.append("comment", "Great service!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responsesController.addComment(commentReq);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toMatch(new RegExp(`^/r/${token}\\?state=.+`));
      if (!location) throw new Error("Location is null");
      expect(decodeURIComponent(location)).toContain('"commented":true');

      // Verify comment was saved
      const responses = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responses).toHaveLength(1);
      expect(responses[0].comment).toBe("Great service!");
    });

    it("should create response with comment if no response exists yet", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[6]; // Score of 6

      // Add comment without first capturing (edge case)
      const formData = new FormData();
      formData.append("comment", "Direct comment");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responsesController.addComment(commentReq);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toMatch(new RegExp(`^/r/${token}\\?state=.+`));
      if (!location) throw new Error("Location is null");
      expect(decodeURIComponent(location)).toContain('"commented":true');

      // Verify response was created with comment
      const responses = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responses).toHaveLength(1);
      expect(responses[0].comment).toBe("Direct comment");
    });

    it("should redirect back for empty comment", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[5]; // Score of 5

      const formData = new FormData();
      formData.append("comment", "   "); // Whitespace only

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responsesController.addComment(commentReq);

      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(`/r/${token}`);

      // Should not create any response
      const responses = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responses).toHaveLength(0);
    });

    it("should handle missing comment field", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[4]; // Score of 4

      const formData = new FormData();
      // Don't add comment field

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responsesController.addComment(commentReq);

      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(`/r/${token}`);
    });

    it("should return 400 for missing token", async () => {
      const formData = new FormData();
      formData.append("comment", "Test comment");

      const req = createBunRequest(
        "http://localhost:3000/r/invalid/comment",
        { method: "POST", body: formData },
        { token: "" },
      );

      const response = await responsesController.addComment(req);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe("Invalid response link");
    });

    it("should return 404 for non-existent token", async () => {
      const formData = new FormData();
      formData.append("comment", "Test comment");

      const req = createBunRequest(
        "http://localhost:3000/r/nonexistent/comment",
        { method: "POST", body: formData },
        { token: "nonexistent" },
      );

      const response = await responsesController.addComment(req);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Response link not found or expired");
    });

    it("should return 404 for expired token", async () => {
      const expiredToken = await createExpiredToken(testBusinessId);

      const formData = new FormData();
      formData.append("comment", "Test comment");

      const req = createBunRequest(
        `http://localhost:3000/r/${expiredToken}/comment`,
        { method: "POST", body: formData },
        { token: expiredToken },
      );

      const response = await responsesController.addComment(req);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Response link not found or expired");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete response flow with comment", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[10]; // Score of 10 (promoter)

      // 1. Capture initial response
      const captureReq = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      const captureResponse = await responsesController.capture(captureReq);
      expect(captureResponse.status).toBe(200);

      // 2. Add comment
      const formData = new FormData();
      formData.append("comment", "Excellent experience!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const commentResponse = await responsesController.addComment(commentReq);
      expect(commentResponse.status).toBe(303);

      // 3. Verify final state
      const responses = await connection`
        SELECT r.*, sl.score, sl.subject_id 
        FROM responses r
        JOIN survey_links sl ON r.survey_link_id = sl.id
        WHERE sl.token = ${token}
      `;

      expect(responses).toHaveLength(1);
      expect(responses[0].score).toBe(10);
      expect(responses[0].comment).toBe("Excellent experience!");
      expect(responses[0].responded_at).toBeInstanceOf(Date);

      // 4. Try to capture again (should show already responded)
      const secondCaptureResponse =
        await responsesController.capture(captureReq);
      expect(secondCaptureResponse.status).toBe(200);

      const html = await secondCaptureResponse.text();
      expect(html).toContain(
        "We&#x27;ve already recorded your response for this survey",
      );
    });
  });
});
