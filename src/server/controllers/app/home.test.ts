import { afterAll, describe, expect, mock, test } from "bun:test";
import type { AuthContext } from "../../middleware/auth";
import { createMockVisitorStats } from "../../test-utils/factories";
import { createMockRequest } from "../../test-utils/setup";

// Mock the analytics service
const mockGetVisitorStats = mock(() => createMockVisitorStats());
mock.module("../../services/analytics", () => ({
  getVisitorStats: mockGetVisitorStats,
}));

// Mock the auth middleware
const mockGetAuthContext = mock(
  (): AuthContext => ({
    user: null,
    business: null,
    isAuthenticated: false,
  }),
);
mock.module("../../middleware/auth", () => ({
  getAuthContext: mockGetAuthContext,
}));

import { home } from "./home";

describe("Home Controller", () => {
  afterAll(() => {
    mock.restore();
  });

  describe("GET /", () => {
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
});
