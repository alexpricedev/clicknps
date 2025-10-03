import { describe, expect, test } from "bun:test";

import { pricing } from "./pricing";

describe("Pricing Controller", () => {
  test("renders pricing page", async () => {
    const mockRequest = new Request("http://localhost:3000/pricing");
    const response = await pricing.index(mockRequest);
    const html = await response.text();

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/html");

    // Test actual HTML content
    expect(html).toContain("Pricing");
  });
});
