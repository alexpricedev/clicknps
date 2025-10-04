import { describe, expect, test } from "bun:test";

import { docs } from "./docs";

describe("Docs Controller", () => {
  test("renders docs page", async () => {
    const mockRequest = new Request("http://localhost:3000/docs");
    const response = await docs.show(mockRequest);
    const html = await response.text();

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/html");

    // Test actual HTML content
    expect(html).toContain("Documentation");
  });
});
