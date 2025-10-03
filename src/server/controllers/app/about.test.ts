import { describe, expect, test } from "bun:test";

import { about } from "./about";

describe("About Controller", () => {
  test("renders about page", async () => {
    const mockRequest = new Request("http://localhost:3000/about");
    const response = await about.index(mockRequest);
    const html = await response.text();

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/html");

    // Test actual HTML content
    expect(html).toContain("About");
  });
});
