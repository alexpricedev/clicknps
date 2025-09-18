import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { ConsoleLogProvider } from "./console";
import type { EmailMessage } from "../email";

describe("ConsoleLogProvider", () => {
  let provider: ConsoleLogProvider;
  let consoleSpy: any;

  beforeEach(() => {
    provider = new ConsoleLogProvider();
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  describe("constructor", () => {
    it("should create an instance of ConsoleLogProvider", () => {
      const newProvider = new ConsoleLogProvider();
      expect(newProvider).toBeInstanceOf(ConsoleLogProvider);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("send", () => {
    it("should log email with all properties including text content", async () => {
      const message: EmailMessage = {
        to: { name: "John Doe", email: "john@example.com" },
        from: { name: "Test App", email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: "Hello World"
      };

      await provider.send(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedOutput = consoleSpy.mock.calls[0][0];
      
      expect(loggedOutput).toContain("📧 EMAIL SEND (Console Provider)");
      expect(loggedOutput).toContain("To: John Doe <john@example.com>");
      expect(loggedOutput).toContain("From: Test App <test@app.com>");
      expect(loggedOutput).toContain("Subject: Test Subject");
      expect(loggedOutput).toContain("HTML Content:");
      expect(loggedOutput).toContain("<h1>Hello World</h1>");
      expect(loggedOutput).toContain("Text Content:");
      expect(loggedOutput).toContain("Hello World");
    });

    it("should log email without names in to/from fields", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>"
      };

      await provider.send(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedOutput = consoleSpy.mock.calls[0][0];
      
      expect(loggedOutput).toContain("To: john@example.com");
      expect(loggedOutput).toContain("From: test@app.com");
      expect(loggedOutput).not.toContain("<john@example.com>");
      expect(loggedOutput).not.toContain("<test@app.com>");
    });

    it("should log email without text content", async () => {
      const message: EmailMessage = {
        to: { name: "John Doe", email: "john@example.com" },
        from: { name: "Test App", email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>"
      };

      await provider.send(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedOutput = consoleSpy.mock.calls[0][0];
      
      expect(loggedOutput).toContain("HTML Content:");
      expect(loggedOutput).toContain("<h1>Hello World</h1>");
      expect(loggedOutput).not.toContain("Text Content:");
    });

    it("should log email with empty text content", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: ""
      };

      await provider.send(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedOutput = consoleSpy.mock.calls[0][0];
      
      expect(loggedOutput).toContain("HTML Content:");
      expect(loggedOutput).not.toContain("Text Content:");
    });

    it("should handle minimal email message", async () => {
      const message: EmailMessage = {
        to: { email: "test@example.com" },
        from: { email: "sender@example.com" },
        subject: "",
        html: ""
      };

      await provider.send(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedOutput = consoleSpy.mock.calls[0][0];
      
      expect(loggedOutput).toContain("📧 EMAIL SEND (Console Provider)");
      expect(loggedOutput).toContain("To: test@example.com");
      expect(loggedOutput).toContain("From: sender@example.com");
      expect(loggedOutput).toContain("Subject: ");
      expect(loggedOutput).toContain("HTML Content:");
    });

    it("should format output with proper structure", async () => {
      const message: EmailMessage = {
        to: { email: "test@example.com" },
        from: { email: "sender@example.com" },
        subject: "Test",
        html: "<p>Test</p>"
      };

      await provider.send(message);

      const loggedOutput = consoleSpy.mock.calls[0][0];
      const lines = loggedOutput.split("\n");
      
      expect(lines[0]).toBe("📧 EMAIL SEND (Console Provider)");
      expect(lines[1]).toBe("================================");
      expect(lines[lines.length - 1]).toBe("================================");
    });
  });
});