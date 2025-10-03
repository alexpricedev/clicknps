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
import { responses } from "./responses";

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

  const survey = await createSurvey(businessId, surveyId, {
    title: "Test Survey",
  });
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
    INSERT INTO surveys (id, business_id, survey_id, title)
    VALUES (${surveyId}, ${businessId}, 'expired-survey', 'Expired Survey')
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

      const response = await responses.capture(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/html");

      const html = await response.text();
      expect(html).toContain("Thank you for your feedback!");
      expect(html).toContain("7"); // Should show the score
      expect(html).not.toContain("already recorded"); // First response

      // Verify response was recorded in database
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
      expect(responsesData[0].comment).toBeNull();
    });

    it("should handle already responded scenario within 180s (show comment form)", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[8]; // Score of 8

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      // First response
      await responses.capture(req);

      // Second response within 180s should show comment form
      const response2 = await responses.capture(req);

      expect(response2.status).toBe(200);
      const html = await response2.text();
      expect(html).toContain("8"); // Should still show the score
      expect(html).toContain("Add more context to your response"); // Should indicate can still comment
      expect(html).toContain("Share your thoughts"); // Should show comment form

      // Should still only have one response in database
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
    });

    it("should handle already responded scenario after 180s (show generic message)", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[8]; // Score of 8

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      // First response
      await responses.capture(req);

      // Manually set the response timestamp to 181 seconds ago
      await connection`
        UPDATE responses
        SET responded_at = CURRENT_TIMESTAMP - INTERVAL '181 seconds'
        WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;

      // Second response after 180s should show generic thank you
      const response2 = await responses.capture(req);

      expect(response2.status).toBe(200);
      const html = await response2.text();
      expect(html).toContain("8"); // Should still show the score
      expect(html).toContain("Response already recorded"); // Should show generic message
      expect(html).not.toContain("Share your thoughts"); // Should NOT show comment form

      // Should still only have one response in database
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
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
      const response1 = await responses.capture(req4);
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
      const response2 = await responses.capture(req7);
      expect(response2.status).toBe(200);
      const html2 = await response2.text();
      expect(html2).toContain("7"); // Should show score 7
      expect(html2).toContain("Add more context to your response"); // Should indicate can still add comment (within 180s)

      // Should only have ONE response in database (for score 4)
      const responsesData = await connection`
        SELECT r.*, sl.score 
        FROM responses r
        JOIN survey_links sl ON r.survey_link_id = sl.id
        WHERE sl.survey_id IN (
          SELECT id FROM surveys 
          WHERE business_id = ${setup.businessId} 
            AND survey_id = ${setup.surveyId}
        )
      `;
      expect(responsesData).toHaveLength(1);
      expect(responsesData[0].score).toBe(4); // Should only have the first response (score 4)
    });

    it("should return 400 for missing token", async () => {
      const req = createBunRequest(
        "http://localhost:3000/r/invalid",
        { method: "GET" },
        { token: "" },
      );

      const response = await responses.capture(req);

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

      const response = await responses.capture(req);

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

      const response = await responses.capture(req);

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
      await responses.capture(captureReq);

      // Then add a comment
      const formData = new FormData();
      formData.append("comment", "Great service!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responses.addComment(commentReq);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toMatch(new RegExp(`^/r/${token}\\?state=.+`));
      if (!location) throw new Error("Location is null");
      expect(decodeURIComponent(location)).toContain('"commented":true');

      // Verify comment was saved
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
      expect(responsesData[0].comment).toBe("Great service!");
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

      const response = await responses.addComment(commentReq);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toMatch(new RegExp(`^/r/${token}\\?state=.+`));
      if (!location) throw new Error("Location is null");
      expect(decodeURIComponent(location)).toContain('"commented":true');

      // Verify response was created with comment
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
      expect(responsesData[0].comment).toBe("Direct comment");
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

      const response = await responses.addComment(commentReq);

      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(`/r/${token}`);

      // Should not create any response
      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(0);
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

      const response = await responses.addComment(commentReq);

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

      const response = await responses.addComment(req);

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

      const response = await responses.addComment(req);

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

      const response = await responses.addComment(req);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Response link not found or expired");
    });
  });

  describe("Redirect Behavior", () => {
    it("should redirect immediately for pre_comment timing", async () => {
      const surveyId = `test-survey-redirect-pre-${randomUUID().slice(0, 8)}`;
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Pre-comment Redirect Survey",
        redirect_url: "https://example.com/thanks",
        redirect_timing: "pre_comment",
      });

      const request: MintLinksRequest = {
        subject_id: "user-redirect-pre",
        ttl_days: 30,
      };
      const mintResult = await mintSurveyLinks(survey, request);
      const token = mintResult.links["8"].split("/r/")[1];

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      const response = await responses.capture(req);

      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(
        "https://example.com/thanks",
      );

      const responsesData = await connection`
        SELECT * FROM responses WHERE survey_link_id IN (
          SELECT id FROM survey_links WHERE token = ${token}
        )
      `;
      expect(responsesData).toHaveLength(1);
    });

    it("should redirect after comment for post_comment timing", async () => {
      const surveyId = `test-survey-redirect-post-${randomUUID().slice(0, 8)}`;
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Post-comment Redirect Survey",
        redirect_url: "https://example.com/feedback-received",
        redirect_timing: "post_comment",
      });

      const request: MintLinksRequest = {
        subject_id: "user-redirect-post",
        ttl_days: 30,
      };
      const mintResult = await mintSurveyLinks(survey, request);
      const token = mintResult.links["9"].split("/r/")[1];

      const captureReq = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );
      const captureResponse = await responses.capture(captureReq);

      expect(captureResponse.status).toBe(200);
      const html = await captureResponse.text();
      expect(html).toContain("Thank you for being a promoter!");

      const formData = new FormData();
      formData.append("comment", "Great service!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const commentResponse = await responses.addComment(commentReq);

      expect(commentResponse.status).toBe(303);
      expect(commentResponse.headers.get("Location")).toBe(
        "https://example.com/feedback-received",
      );
    });

    it("should show thank you page when no redirect configured", async () => {
      const surveyId = `test-survey-no-redirect-${randomUUID().slice(0, 8)}`;
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "No Redirect Survey",
      });

      const request: MintLinksRequest = {
        subject_id: "user-no-redirect",
        ttl_days: 30,
      };
      const mintResult = await mintSurveyLinks(survey, request);
      const token = mintResult.links["7"].split("/r/")[1];

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      const response = await responses.capture(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/html");
      const html = await response.text();
      expect(html).toContain("Thank you for your feedback!");
    });

    it("should not redirect on capture when redirect_timing is post_comment", async () => {
      const surveyId = `test-survey-post-only-${randomUUID().slice(0, 8)}`;
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Post-only Redirect Survey",
        redirect_url: "https://example.com/later",
        redirect_timing: "post_comment",
      });

      const request: MintLinksRequest = {
        subject_id: "user-post-only",
        ttl_days: 30,
      };
      const mintResult = await mintSurveyLinks(survey, request);
      const token = mintResult.links["6"].split("/r/")[1];

      const req = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );

      const response = await responses.capture(req);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Thank you for your honest feedback!");
    });

    it("should not redirect on comment when redirect_timing is pre_comment", async () => {
      const surveyId = `test-survey-pre-only-${randomUUID().slice(0, 8)}`;
      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Pre-only Redirect Survey",
        redirect_url: "https://example.com/early",
        redirect_timing: "pre_comment",
      });

      const request: MintLinksRequest = {
        subject_id: "user-pre-only",
        ttl_days: 30,
      };
      const mintResult = await mintSurveyLinks(survey, request);
      const token = mintResult.links["5"].split("/r/")[1];

      await connection`
        INSERT INTO responses (id, survey_link_id)
        SELECT ${randomUUID()}, id FROM survey_links WHERE token = ${token}
      `;

      const formData = new FormData();
      formData.append("comment", "Good experience");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const response = await responses.addComment(commentReq);

      expect(response.status).toBe(303);
      const location = response.headers.get("Location");
      expect(location).toMatch(new RegExp(`^/r/${token}`));
      expect(location).not.toBe("https://example.com/early");
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

      const captureResponse = await responses.capture(captureReq);
      expect(captureResponse.status).toBe(200);

      // 2. Add comment
      const formData = new FormData();
      formData.append("comment", "Excellent experience!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );

      const commentResponse = await responses.addComment(commentReq);
      expect(commentResponse.status).toBe(303);

      // 3. Verify final state
      const responsesData = await connection`
        SELECT r.*, sl.score, sl.subject_id 
        FROM responses r
        JOIN survey_links sl ON r.survey_link_id = sl.id
        WHERE sl.token = ${token}
      `;

      expect(responsesData).toHaveLength(1);
      expect(responsesData[0].score).toBe(10);
      expect(responsesData[0].comment).toBe("Excellent experience!");
      expect(responsesData[0].responded_at).toBeInstanceOf(Date);

      // 4. Try to capture again (should show already responded)
      const secondCaptureResponse = await responses.capture(captureReq);
      expect(secondCaptureResponse.status).toBe(200);

      const html = await secondCaptureResponse.text();
      expect(html).toContain("Add more context to your response");
    });

    it("should refresh webhook timer when comment added within 180s", async () => {
      const setup = await createTestSurveySetup(testBusinessId);
      const token = setup.tokens[9]; // Score of 9

      // Set up webhook for this business
      await connection`
        UPDATE businesses
        SET webhook_url = 'https://example.com/webhook',
            webhook_secret = 'test-secret'
        WHERE id = ${setup.businessId}
      `;

      // 1. Capture initial response
      const captureReq = createBunRequest(
        `http://localhost:3000/r/${token}`,
        { method: "GET" },
        { token },
      );
      await responses.capture(captureReq);

      // Check initial webhook timing
      const initialWebhook = await connection`
        SELECT scheduled_for FROM webhook_queue
        WHERE business_id = ${setup.businessId}
          AND survey_id = ${setup.surveyId}
          AND subject_id = ${setup.subjectId}
      `;
      expect(initialWebhook).toHaveLength(1);
      const initialScheduledFor = new Date(initialWebhook[0].scheduled_for);

      // Wait a moment to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. Add comment (within 180s)
      const formData = new FormData();
      formData.append("comment", "Great service!");

      const commentReq = createBunRequest(
        `http://localhost:3000/r/${token}/comment`,
        { method: "POST", body: formData },
        { token },
      );
      await responses.addComment(commentReq);

      // Check that webhook timer was refreshed
      const updatedWebhook = await connection`
        SELECT scheduled_for FROM webhook_queue
        WHERE business_id = ${setup.businessId}
          AND survey_id = ${setup.surveyId}
          AND subject_id = ${setup.subjectId}
      `;
      expect(updatedWebhook).toHaveLength(1);
      const updatedScheduledFor = new Date(updatedWebhook[0].scheduled_for);

      // Updated scheduled time should be later than initial
      expect(updatedScheduledFor.getTime()).toBeGreaterThan(
        initialScheduledFor.getTime(),
      );
    });
  });
});
