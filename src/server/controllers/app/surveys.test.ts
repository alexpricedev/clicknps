import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { SQL } from "bun";
import {
  createSession,
  createSessionCookie,
  createUser,
} from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { createBunRequest } from "../../test-utils/bun-request";
import { cleanupTestData, randomEmail } from "../../test-utils/helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

// Mock the survey service
const mockListSurveys = mock(() => [
  {
    id: "survey-1",
    business_id: "business-1",
    survey_id: "customer-satisfaction",
    title: "Customer Satisfaction",
    description: "Q4 customer satisfaction survey",
    ttl_days: 30,
    created_at: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "survey-2",
    business_id: "business-1",
    survey_id: "employee-nps",
    title: "Employee NPS",
    description: null,
    ttl_days: 14,
    created_at: new Date("2024-01-15T00:00:00Z"),
  },
]);

const mockFindSurvey = mock((businessId: string, surveyId: string) => {
  if (surveyId === "existing-survey") {
    return {
      id: "existing-survey-id",
      business_id: businessId,
      survey_id: surveyId,
      title: "Existing Survey",
      description: null,
      ttl_days: 30,
      created_at: new Date(),
    };
  }
  return null;
});

const mockCreateSurvey = mock(
  (
    businessId: string,
    surveyId: string,
    options?: { title?: string; description?: string; ttl_days?: number },
  ) => ({
    id: "new-survey-id",
    business_id: businessId,
    survey_id: surveyId,
    title: options?.title || null,
    description: options?.description || null,
    ttl_days: options?.ttl_days || 30,
    created_at: new Date(),
  }),
);

const mockMintSurveyLinks = mock(() => ({
  links: {
    "0": "http://localhost:3000/r/token0",
    "1": "http://localhost:3000/r/token1",
    "2": "http://localhost:3000/r/token2",
    "3": "http://localhost:3000/r/token3",
    "4": "http://localhost:3000/r/token4",
    "5": "http://localhost:3000/r/token5",
    "6": "http://localhost:3000/r/token6",
    "7": "http://localhost:3000/r/token7",
    "8": "http://localhost:3000/r/token8",
    "9": "http://localhost:3000/r/token9",
    "10": "http://localhost:3000/r/token10",
  },
  expires_at: "2025-10-20T10:00:00.000Z",
}));

const mockGetSurveyResponses = mock((surveyId: string) => {
  if (surveyId === "existing-survey-id") {
    return [
      {
        id: "response-1",
        responded_at: new Date("2024-02-01T10:30:00Z"),
        comment: "Great service!",
        score: 9,
        subject_id: "customer-123",
      },
      {
        id: "response-2",
        responded_at: new Date("2024-02-01T09:15:00Z"),
        comment: null,
        score: 5,
        subject_id: "customer-456",
      },
    ];
  }
  return [];
});

mock.module("../../services/surveys", () => ({
  listSurveys: mockListSurveys,
  findSurvey: mockFindSurvey,
  createSurvey: mockCreateSurvey,
  mintSurveyLinks: mockMintSurveyLinks,
  getSurveyResponses: mockGetSurveyResponses,
}));

import { surveys } from "./surveys";

describe("Surveys Controller", () => {
  beforeEach(async () => {
    await cleanupTestData(connection);
  });

  afterEach(() => {
    mockListSurveys.mockClear();
    mockFindSurvey.mockClear();
    mockCreateSurvey.mockClear();
    mockMintSurveyLinks.mockClear();
    mockGetSurveyResponses.mockClear();
  });

  afterAll(async () => {
    await connection.end();
    mock.restore();
  });

  const createTestSession = async () => {
    const user = await createUser(randomEmail(), "Test Business");
    const sessionId = await createSession(user.id);
    return [sessionId, user.business_id];
  };

  describe("GET /surveys", () => {
    test("renders survey list", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest("http://localhost:3000/surveys", {
        headers: { Cookie: cookieHeader },
      });
      const response = await surveys.index(request);
      const html = await response.text();

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Your Surveys");
      expect(html).toContain("Customer Satisfaction");
      expect(html).toContain("customer-satisfaction");
      expect(html).toContain("Employee NPS");
      expect(html).toContain("employee-nps");
      expect(html).toContain("Create Survey");
      expect(html).toContain("Mint Links");
    });

    test("displays success state after survey creation", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const stateData = {
        created: {
          surveyId: "new-survey",
          title: "New Survey",
        },
      };
      const encodedState = encodeURIComponent(JSON.stringify(stateData));
      const urlPath = `/surveys?state=${encodedState}`;

      const request = createBunRequest(`http://localhost:3000${urlPath}`, {
        headers: { Cookie: cookieHeader },
      });
      const response = await surveys.index(request);
      const html = await response.text();

      expect(html).toContain(
        "Survey &quot;<!-- -->New Survey<!-- -->&quot; (ID:<!-- --> <!-- -->new-survey<!-- -->) created successfully!",
      );
      expect(html).toContain("You can now mint links for different subjects");
    });
  });

  describe("GET /surveys/new", () => {
    test("renders survey creation form", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        headers: { Cookie: cookieHeader },
      });
      const response = await surveys.new(request);
      const html = await response.text();

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Create New Survey");
      expect(html).toContain('name="title"');
      expect(html).toContain('name="surveyId"');
      expect(html).toContain('name="description"');
      expect(html).toContain('name="ttlDays"');
      expect(html).toContain("Create Survey");
    });
  });

  describe("POST /surveys/new", () => {
    test("creates survey with valid form data", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "Customer Satisfaction");
      mockFormData.set("description", "Q4 customer satisfaction survey");
      mockFormData.set("surveyId", "customer-satisfaction-q4");
      mockFormData.set("ttlDays", "14");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(mockCreateSurvey).toHaveBeenCalledWith(
        businessId,
        "customer-satisfaction-q4",
        {
          title: "Customer Satisfaction",
          description: "Q4 customer satisfaction survey",
          ttl_days: 14,
        },
      );

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("/surveys");
      expect(response.headers.get("location")).toContain("state=");
    });

    test("creates survey without description", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "Simple Survey");
      mockFormData.set("surveyId", "simple-survey");
      mockFormData.set("ttlDays", "30");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(mockCreateSurvey).toHaveBeenCalledWith(
        businessId,
        "simple-survey",
        {
          title: "Simple Survey",
          description: undefined,
          ttl_days: 30,
        },
      );

      expect(response.status).toBe(303);
    });

    test("validates required fields", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "");
      mockFormData.set("surveyId", "test");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("/surveys/new");
      expect(response.headers.get("location")).toContain("error");
      expect(mockCreateSurvey).not.toHaveBeenCalled();
    });

    test("validates survey ID format", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "Test Survey");
      mockFormData.set("surveyId", "invalid survey id!");
      mockFormData.set("ttlDays", "30");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("/surveys/new");
      expect(response.headers.get("location")).toContain("error");
    });

    test("converts uppercase survey ID to lowercase and creates survey", async () => {
      const [sessionId, businessId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "Test Survey");
      mockFormData.set("surveyId", "Test-Survey-ID");
      mockFormData.set("ttlDays", "30");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(mockCreateSurvey).toHaveBeenCalledWith(
        businessId,
        "test-survey-id",
        {
          title: "Test Survey",
          description: undefined,
          ttl_days: 30,
        },
      );

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("/surveys");
    });

    test("prevents creating survey with existing ID", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/new",
      );

      const mockFormData = new FormData();
      mockFormData.set("title", "Test Survey");
      mockFormData.set("surveyId", "existing-survey");
      mockFormData.set("ttlDays", "30");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest("http://localhost:3000/surveys/new", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: cookieHeader,
        },
        body: mockFormData,
      });

      const response = await surveys.create(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain("/surveys/new");
      expect(response.headers.get("location")).toContain("error");
      expect(mockCreateSurvey).not.toHaveBeenCalled();
    });
  });

  describe("GET /surveys/:surveyId/mint", () => {
    test("renders mint form for valid survey", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest(
        "http://localhost:3000/surveys/existing-survey/mint",
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "existing-survey" },
      );
      const response = await surveys.mintForm(request);
      const html = await response.text();

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Mint Links for Survey");
      expect(html).toContain("Existing Survey");
      expect(html).toContain('name="subjectId"');
      expect(html).toContain('name="ttlDays"');
      expect(html).toContain("Generate NPS Links");
    });

    test("returns 404 for non-existent survey", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest(
        "http://localhost:3000/surveys/non-existent/mint",
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "non-existent" },
      );
      const response = await surveys.mintForm(request);

      expect(response.status).toBe(404);
    });

    test("renders success state with generated links", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const stateData = {
        success: {
          subjectId: "customer-123",
          links: {
            "0": "http://localhost:3000/r/token0",
            "1": "http://localhost:3000/r/token1",
            "2": "http://localhost:3000/r/token2",
            "3": "http://localhost:3000/r/token3",
            "4": "http://localhost:3000/r/token4",
            "5": "http://localhost:3000/r/token5",
            "6": "http://localhost:3000/r/token6",
            "7": "http://localhost:3000/r/token7",
            "8": "http://localhost:3000/r/token8",
            "9": "http://localhost:3000/r/token9",
            "10": "http://localhost:3000/r/token10",
          },
          expires_at: "2025-10-20T10:00:00.000Z",
        },
      };
      const encodedState = encodeURIComponent(JSON.stringify(stateData));
      const urlPath = `/surveys/existing-survey/mint?state=${encodedState}`;

      const request = createBunRequest(
        `http://localhost:3000${urlPath}`,
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "existing-survey" },
      );
      const response = await surveys.mintForm(request);
      const html = await response.text();

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Links generated successfully!");
      expect(html).toContain(
        "subject &quot;<!-- -->customer-123<!-- -->&quot;",
      );
      expect(html).toContain("Generated NPS Links (Score 0-10):");

      // Verify all links are rendered
      for (let score = 0; score <= 10; score++) {
        expect(html).toContain(`${score}<!-- -->:`);
        expect(html).toContain(`http://localhost:3000/r/token${score}`);
      }

      expect(html).toContain("10/20/2025");
    });
  });

  describe("POST /surveys/:surveyId/mint", () => {
    test("mints links with valid form data", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/existing-survey/mint",
      );

      const mockFormData = new FormData();
      mockFormData.set("subjectId", "customer-123");
      mockFormData.set("ttlDays", "14");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/surveys/existing-survey/mint",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: mockFormData,
        },
        { surveyId: "existing-survey" },
      );

      const response = await surveys.mint(request);

      expect(mockMintSurveyLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "existing-survey-id",
          survey_id: "existing-survey",
        }),
        {
          subject_id: "customer-123",
          ttl_days: 14,
        },
      );

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain(
        "/surveys/existing-survey/mint",
      );
      expect(response.headers.get("location")).toContain("state=");
    });

    test("uses survey default TTL when not provided", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/existing-survey/mint",
      );

      const mockFormData = new FormData();
      mockFormData.set("subjectId", "customer-456");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/surveys/existing-survey/mint",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: mockFormData,
        },
        { surveyId: "existing-survey" },
      );

      const response = await surveys.mint(request);

      expect(mockMintSurveyLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "existing-survey-id",
          survey_id: "existing-survey",
        }),
        {
          subject_id: "customer-456",
          ttl_days: undefined,
        },
      );

      expect(response.status).toBe(303);
    });

    test("validates required subjectId", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/existing-survey/mint",
      );

      const mockFormData = new FormData();
      mockFormData.set("subjectId", "");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/surveys/existing-survey/mint",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: mockFormData,
        },
        { surveyId: "existing-survey" },
      );

      const response = await surveys.mint(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain(
        "/surveys/existing-survey/mint",
      );
      expect(response.headers.get("location")).toContain("error");
      expect(mockMintSurveyLinks).not.toHaveBeenCalled();
    });

    test("returns error for non-existent survey", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);
      const csrfToken = await createCsrfToken(
        sessionId,
        "POST",
        "/surveys/non-existent/mint",
      );

      const mockFormData = new FormData();
      mockFormData.set("subjectId", "customer-123");
      mockFormData.set("_csrf", csrfToken);

      const request = createBunRequest(
        "http://localhost:3000/surveys/non-existent/mint",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            Cookie: cookieHeader,
          },
          body: mockFormData,
        },
        { surveyId: "non-existent" },
      );

      const response = await surveys.mint(request);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain(
        "/surveys/non-existent/mint",
      );
      expect(response.headers.get("location")).toContain("error");
      expect(mockMintSurveyLinks).not.toHaveBeenCalled();
    });
  });

  describe("GET /surveys/:surveyId/responses", () => {
    test("renders responses page for valid survey", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest(
        "http://localhost:3000/surveys/existing-survey/responses",
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "existing-survey" },
      );
      const response = await surveys.responses(request);
      const html = await response.text();

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain("Survey Responses");
      expect(html).toContain("Existing Survey");
      expect(html).toContain("existing-survey");

      // Check for response data
      expect(html).toContain("Great service!");
      expect(html).toContain("customer-123");
      expect(html).toContain("customer-456");
      expect(html).toContain("No comment");

      // Check for navigation buttons
      expect(html).toContain("Mint Links");
      expect(html).toContain("Back to Surveys");

      // Check for response count (React renders with HTML comments)
      expect(html).toContain("Total responses: <!-- -->2");
    });

    test("renders empty state when survey has no responses", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      // Mock empty responses for a different survey
      const mockEmptyResponses = mock(() => []);
      const mockFindEmptySurvey = mock(() => ({
        id: "empty-survey-id",
        business_id: "business-1",
        survey_id: "empty-survey",
        title: "Empty Survey",
        description: null,
        ttl_days: 30,
        created_at: new Date(),
      }));

      // Temporarily override mocks
      mockGetSurveyResponses.mockImplementation(mockEmptyResponses);
      mockFindSurvey.mockImplementation(
        (_businessId: string, surveyId: string) => {
          if (surveyId === "empty-survey") {
            return mockFindEmptySurvey();
          }
          return null;
        },
      );

      const request = createBunRequest(
        "http://localhost:3000/surveys/empty-survey/responses",
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "empty-survey" },
      );
      const response = await surveys.responses(request);
      const html = await response.text();

      expect(html).toContain("No responses yet");
      expect(html).toContain(
        "This survey hasn&#x27;t received any responses yet",
      );
      expect(html).toContain("Mint some links");
    });

    test("returns 404 for non-existent survey", async () => {
      const [sessionId] = await createTestSession();
      const cookieHeader = createSessionCookie(sessionId);

      const request = createBunRequest(
        "http://localhost:3000/surveys/non-existent/responses",
        {
          headers: { Cookie: cookieHeader },
        },
        { surveyId: "non-existent" },
      );
      const response = await surveys.responses(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toContain("Survey not found");
    });
  });
});
