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
import { createSession, createUser } from "../../services/auth";
import { createBunRequest } from "../../test-utils/bun-request";
import { cleanupTestData, randomEmail } from "../../test-utils/helpers";
import { createMockRequest } from "../../test-utils/setup";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

mock.module("../../services/database", () => ({
  get db() {
    return connection;
  },
}));

// Mock analytics service
const mockGetVisitorStats = mock(() => ({
  totalVisitors: 1234,
  totalPageViews: 5678,
  avgTimeOnSite: 180,
}));

const mockGetDashboardStats = mock(() => ({
  totalResponses: {
    value7d: 150,
    value30d: 420,
    delta7d: 10,
    delta30d: 25,
  },
  averageNps: {
    value7d: 42,
    value30d: 38,
    delta7d: 5,
    delta30d: -2,
  },
  responseRate: {
    value7d: 75,
    value30d: 68,
    delta7d: 3,
    delta30d: -5,
  },
  comments: {
    value7d: 45,
    value30d: 120,
    delta7d: 8,
    delta30d: 15,
  },
}));

const mockGetLatestResponses = mock(() => [
  {
    surveyName: "Product Feedback",
    subjectId: "subject-1",
    score: 9,
    comment: "Great product!",
    respondedAt: new Date(),
  },
  {
    surveyName: "Service Quality",
    subjectId: "subject-2",
    score: 7,
    comment: "Good service",
    respondedAt: new Date(),
  },
]);

const mockGetWeeklyNpsData = mock(() => [
  {
    weekLabel: "2024-W01",
    weekStart: new Date("2024-01-01"),
    weekEnd: new Date("2024-01-07"),
    averageNps: 40,
    responseCount: 10,
  },
  {
    weekLabel: "2024-W02",
    weekStart: new Date("2024-01-08"),
    weekEnd: new Date("2024-01-14"),
    averageNps: 45,
    responseCount: 15,
  },
]);

mock.module("../../services/analytics", () => ({
  getVisitorStats: mockGetVisitorStats,
  getDashboardStats: mockGetDashboardStats,
  getLatestResponses: mockGetLatestResponses,
  getWeeklyNpsData: mockGetWeeklyNpsData,
}));

// Import after mocking
import { home } from "./home";

describe("Home Controller", () => {
  beforeEach(async () => {
    await cleanupTestData(connection);
    mockGetVisitorStats.mockClear();
    mockGetDashboardStats.mockClear();
    mockGetLatestResponses.mockClear();
    mockGetWeeklyNpsData.mockClear();
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

  describe("GET / (unauthenticated)", () => {
    test("renders home page with content", async () => {
      const request = createMockRequest("http://localhost:3000/", "GET");
      const response = await home.index(request);
      const html = await response.text();

      expect(mockGetVisitorStats).toHaveBeenCalled();
      expect(response.headers.get("content-type")).toBe("text/html");

      expect(html).toContain(
        "Track Customer Satisfaction with Simple NPS Surveys",
      );
      expect(html).toContain("ClickNPS makes it easy to collect");
      expect(html).toContain("Unique Survey Links");
      expect(html).toContain("Real-time Analytics");
      expect(html).toContain("Webhook Integration");
    });

    test("returns 200 status for home page", async () => {
      const request = createMockRequest("http://localhost:3000/", "GET");
      const response = await home.index(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
    });
  });

  describe("GET / (authenticated)", () => {
    let sessionId: string;
    let businessId: string;

    beforeEach(async () => {
      const user = await createUser(randomEmail(), "Test Business");
      sessionId = await createSession(user.id);
      businessId = user.business_id;
    });

    test("renders dashboard for authenticated user", async () => {
      const request = createBunRequest("http://localhost:3000/", {
        method: "GET",
        headers: {
          cookie: `session_id=${sessionId}`,
        },
      });

      const response = await home.index(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");

      // Verify dashboard content is rendered
      expect(html).toContain("Dashboard");
      expect(mockGetDashboardStats).toHaveBeenCalledWith(businessId);
      expect(mockGetLatestResponses).toHaveBeenCalledWith(businessId, 6);
      expect(mockGetWeeklyNpsData).toHaveBeenCalledWith(businessId, 12);
    });

    test("displays NPS score in dashboard", async () => {
      mockGetDashboardStats.mockReturnValue({
        totalResponses: {
          value7d: 150,
          value30d: 420,
          delta7d: 10,
          delta30d: 25,
        },
        averageNps: {
          value7d: 42,
          value30d: 38,
          delta7d: 5,
          delta30d: -2,
        },
        responseRate: {
          value7d: 75,
          value30d: 68,
          delta7d: 3,
          delta30d: -5,
        },
        comments: {
          value7d: 45,
          value30d: 120,
          delta7d: 8,
          delta30d: 15,
        },
      });

      const request = createBunRequest("http://localhost:3000/", {
        method: "GET",
        headers: {
          cookie: `session_id=${sessionId}`,
        },
      });

      const response = await home.index(request);
      const html = await response.text();

      expect(html).toContain("42");
      expect(html).toContain("Average NPS");
    });

    test("displays latest responses in dashboard", async () => {
      const request = createBunRequest("http://localhost:3000/", {
        method: "GET",
        headers: {
          cookie: `session_id=${sessionId}`,
        },
      });

      const response = await home.index(request);
      const html = await response.text();

      expect(html).toContain("Product Feedback");
      expect(html).toContain("Great product!");
      expect(html).toContain("Service Quality");
    });

    test("displays success state when provided", async () => {
      const request = createBunRequest(
        "http://localhost:3000/?state=" +
          encodeURIComponent(
            JSON.stringify({ success: "Welcome to your team!" }),
          ),
        {
          method: "GET",
          headers: {
            cookie: `session_id=${sessionId}`,
          },
        },
      );

      const response = await home.index(request);
      const html = await response.text();

      expect(html).toContain("Welcome to your team!");
    });
  });
});
