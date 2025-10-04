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

import { createSurvey, findSurvey } from "./surveys";

describe("Surveys Service", () => {
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

    it("should create survey with only title when minimal options provided", async () => {
      const surveyId = "test-survey-2";

      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "Test Survey",
      });

      expect(survey.title).toBe("Test Survey");
      expect(survey.description).toBeNull();
    });

    it("should create survey with redirect_url and redirect_timing", async () => {
      const surveyId = "test-survey-redirect";
      const options = {
        title: "Redirect Survey",
        redirect_url: "https://example.com/thank-you",
        redirect_timing: "post_comment" as const,
      };

      const survey = await createSurvey(testBusinessId, surveyId, options);

      expect(survey).toBeDefined();
      expect(survey.redirect_url).toBe("https://example.com/thank-you");
      expect(survey.redirect_timing).toBe("post_comment");
    });

    it("should create survey with pre_comment redirect timing", async () => {
      const surveyId = "test-survey-redirect-pre";
      const options = {
        title: "Pre-comment Redirect Survey",
        redirect_url: "https://example.com/instant-redirect",
        redirect_timing: "pre_comment" as const,
      };

      const survey = await createSurvey(testBusinessId, surveyId, options);

      expect(survey.redirect_url).toBe("https://example.com/instant-redirect");
      expect(survey.redirect_timing).toBe("pre_comment");
    });

    it("should create survey with null redirect fields when not provided", async () => {
      const surveyId = "test-survey-no-redirect";

      const survey = await createSurvey(testBusinessId, surveyId, {
        title: "No Redirect Survey",
      });

      expect(survey.redirect_url).toBeNull();
      expect(survey.redirect_timing).toBeNull();
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

    it("should return survey with redirect fields", async () => {
      const surveyId = "test-survey-with-redirect";

      const createdSurvey = await createSurvey(testBusinessId, surveyId, {
        title: "Redirect Survey",
        redirect_url: "https://example.com/redirect",
        redirect_timing: "pre_comment",
      });

      const foundSurvey = await findSurvey(testBusinessId, surveyId);

      expect(foundSurvey).not.toBeNull();
      if (foundSurvey) {
        expect(foundSurvey.id).toBe(createdSurvey.id);
        expect(foundSurvey.redirect_url).toBe("https://example.com/redirect");
        expect(foundSurvey.redirect_timing).toBe("pre_comment");
      }
    });
  });
});
