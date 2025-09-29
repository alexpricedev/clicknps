import { describe, expect, test } from "bun:test";

import { about } from "./about";
import { contact } from "./contact";

describe("Static Page Controllers", () => {
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

  describe("Contact Controller", () => {
    test("renders contact page", async () => {
      const mockRequest = new Request("http://localhost:3000/contact");
      const response = await contact.index(mockRequest);
      const html = await response.text();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toBe("text/html");

      // Test actual HTML content
      expect(html).toContain("Contact");
    });
  });
});
