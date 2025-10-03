import { describe, expect, test } from "bun:test";
import { stateHelpers } from "./state";

// Mock APP_ORIGIN for tests
const originalAppOrigin = process.env.APP_ORIGIN;
process.env.APP_ORIGIN = "http://localhost:3000";

interface TestState {
  created?: boolean;
  surveyData?: {
    name: string;
    description?: string;
    surveyId: string;
    links: Record<string, string>;
    expires_at: string;
  };
}

describe("State Helpers", () => {
  const { parseState, buildRedirectUrlWithState: redirectWithState } =
    stateHelpers<TestState>();

  test("should handle simple boolean state", () => {
    const stateObj = { created: true };
    const encodedState = encodeURIComponent(JSON.stringify(stateObj));
    const url = new URL(`http://localhost:3000/surveys?state=${encodedState}`);
    const result = parseState(url);

    expect(result.created).toBe(true);
  });

  test("should handle complex object state", () => {
    const surveyData = {
      name: "Test Survey",
      description: "A test survey",
      surveyId: "test-survey-1",
      links: {
        "0": "http://localhost:3000/r/token0",
        "5": "http://localhost:3000/r/token5",
        "10": "http://localhost:3000/r/token10",
      },
      expires_at: "2025-10-20T10:00:00.000Z",
    };

    // First create a redirect URL with complex state
    const redirectUrl = redirectWithState("/surveys", {
      created: true,
      surveyData,
    });

    // Then parse it back
    const fullUrl = new URL(redirectUrl, "http://localhost:3000");
    const parsedState = parseState(fullUrl);

    expect(parsedState.created).toBe(true);
    expect(parsedState.surveyData).toEqual(surveyData);
    expect(parsedState.surveyData?.links).toBeDefined();
    expect(parsedState.surveyData?.links?.["0"]).toBe(
      "http://localhost:3000/r/token0",
    );
  });

  test("should handle mixed state types", () => {
    const stateObj = {
      created: true,
      count: 5,
      commented: true,
      data: { test: "value" },
    };
    const encodedState = encodeURIComponent(JSON.stringify(stateObj));
    const url = new URL(`http://localhost:3000/surveys?state=${encodedState}`);

    const result = parseState(url);

    expect(result.created).toBe(true);
    expect(result).toHaveProperty("count", 5); // Should be parsed as number from JSON
    expect(result).toHaveProperty("commented", true); // Should be parsed as boolean
    expect(result).toHaveProperty("data", { test: "value" }); // Should be parsed as object
  });

  test("should handle malformed JSON gracefully", () => {
    const url = new URL("http://localhost:3000/surveys");
    url.searchParams.set("state", "not-json{invalid");

    const result = parseState(url);

    expect(result).toEqual({}); // Should return empty object when JSON parsing fails
  });

  test("should handle missing state parameter", () => {
    const url = new URL("http://localhost:3000/surveys");
    const result = parseState(url);

    expect(result).toEqual({}); // Should return empty object when no state parameter
  });

  test("redirectWithState should create proper URLs", () => {
    const state: TestState = {
      created: true,
      surveyData: {
        name: "Test Survey",
        surveyId: "test-1",
        links: { "0": "http://test.com/r/abc" },
        expires_at: "2025-01-01T00:00:00.000Z",
      },
    };

    const result = redirectWithState("/surveys", state);

    expect(result).toContain("/surveys?");
    expect(result).toContain("state=");

    // Verify the URL can be parsed back correctly
    const fullUrl = new URL(result, "http://localhost:3000");
    const parsed = parseState(fullUrl);
    expect(parsed).toEqual(state);
  });
});

// Restore original APP_ORIGIN
process.env.APP_ORIGIN = originalAppOrigin;
