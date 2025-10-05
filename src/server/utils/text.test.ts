import { describe, expect, it } from "bun:test";
import { slugToLabel, toTitleCase } from "./text";

describe("text utils", () => {
  describe("toTitleCase", () => {
    it("should capitalize regular words", () => {
      expect(toTitleCase("hello world")).toBe("Hello World");
      expect(toTitleCase("user guide")).toBe("User Guide");
    });

    it("should preserve special capitalized words", () => {
      expect(toTitleCase("api overview")).toBe("API Overview");
      expect(toTitleCase("rest api documentation")).toBe(
        "REST API Documentation",
      );
      expect(toTitleCase("http and https protocols")).toBe(
        "HTTP and HTTPS Protocols",
      );
    });

    it("should handle mixed cases", () => {
      expect(toTitleCase("api and rest services")).toBe(
        "API and REST Services",
      );
      expect(toTitleCase("json data format")).toBe("JSON Data Format");
    });

    it("should handle empty strings", () => {
      expect(toTitleCase("")).toBe("");
    });

    it("should handle single words", () => {
      expect(toTitleCase("api")).toBe("API");
      expect(toTitleCase("hello")).toBe("Hello");
    });
  });

  describe("slugToLabel", () => {
    it("should convert slugs to proper labels", () => {
      expect(slugToLabel("api-overview")).toBe("API Overview");
      expect(slugToLabel("user-guide")).toBe("User Guide");
      expect(slugToLabel("rest-api-documentation")).toBe(
        "REST API Documentation",
      );
    });

    it("should handle nested slugs", () => {
      expect(slugToLabel("docs/api/overview")).toBe("Overview");
      expect(slugToLabel("guides/user-management")).toBe("User Management");
    });

    it("should handle single word slugs", () => {
      expect(slugToLabel("api")).toBe("API");
      expect(slugToLabel("installation")).toBe("Installation");
    });

    it("should handle empty slugs", () => {
      expect(slugToLabel("")).toBe("");
    });

    it("should preserve special words in various positions", () => {
      expect(slugToLabel("api-guide")).toBe("API Guide");
      expect(slugToLabel("guide-to-api")).toBe("Guide to API");
      expect(slugToLabel("http-api-documentation")).toBe(
        "HTTP API Documentation",
      );
    });

    it("should handle common words in lowercase", () => {
      expect(slugToLabel("api-and-rest-guide")).toBe("API and REST Guide");
      expect(slugToLabel("user-guide-for-api")).toBe("User Guide for API");
      expect(slugToLabel("overview-of-http-and-https")).toBe(
        "Overview of HTTP and HTTPS",
      );
    });
  });
});
