import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { EmailMessage } from "../email";
import { ResendProvider } from "./resend";

describe("ResendProvider", () => {
  let provider: ResendProvider;
  let mockResendClient: {
    emails: {
      send: ReturnType<typeof mock>;
    };
  };

  beforeEach(() => {
    mockResendClient = {
      emails: {
        send: mock(async () => ({ data: { id: "test-id" }, error: null })),
      },
    };

    provider = new ResendProvider("test-api-key");
    (provider as unknown as { client: typeof mockResendClient }).client =
      mockResendClient;
  });

  describe("constructor", () => {
    it("should throw error when API key is missing", () => {
      expect(() => new ResendProvider("")).toThrow(
        "Resend API key is required",
      );
    });

    it("should create instance with valid API key", () => {
      const newProvider = new ResendProvider("valid-key");
      expect(newProvider).toBeInstanceOf(ResendProvider);
    });
  });

  describe("send", () => {
    it("should send email with all fields", async () => {
      const message: EmailMessage = {
        to: { name: "John Doe", email: "john@example.com" },
        from: { name: "Test App", email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: "Hello World",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledTimes(1);
      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "Test App <test@app.com>",
        to: "John Doe <john@example.com>",
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: "Hello World",
      });
    });

    it("should send email without names", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "test@app.com",
        to: "john@example.com",
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: undefined,
      });
    });

    it("should send email with only to name", async () => {
      const message: EmailMessage = {
        to: { name: "John Doe", email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "test@app.com",
        to: "John Doe <john@example.com>",
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: undefined,
      });
    });

    it("should send email with only from name", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { name: "Test App", email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "Test App <test@app.com>",
        to: "john@example.com",
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: undefined,
      });
    });

    it("should send email without text content", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "test@app.com",
        to: "john@example.com",
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
        text: undefined,
      });
    });

    it("should handle Resend API error response", async () => {
      mockResendClient.emails.send = mock(async () => ({
        data: null,
        error: { message: "Invalid API key", name: "validation_error" },
      }));

      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await expect(provider.send(message)).rejects.toThrow(
        "Resend API error: Invalid API key",
      );
    });

    it("should handle network error", async () => {
      mockResendClient.emails.send = mock(async () => {
        throw new Error("Network error");
      });

      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await expect(provider.send(message)).rejects.toThrow(
        "Failed to send email via Resend: Network error",
      );
    });

    it("should handle unknown error", async () => {
      mockResendClient.emails.send = mock(async () => {
        throw "Unknown error";
      });

      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "<h1>Hello World</h1>",
      };

      await expect(provider.send(message)).rejects.toThrow(
        "Failed to send email via Resend: Unknown error",
      );
    });

    it("should handle empty subject", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "",
        html: "<h1>Hello World</h1>",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "test@app.com",
        to: "john@example.com",
        subject: "",
        html: "<h1>Hello World</h1>",
        text: undefined,
      });
    });

    it("should handle empty HTML content", async () => {
      const message: EmailMessage = {
        to: { email: "john@example.com" },
        from: { email: "test@app.com" },
        subject: "Test Subject",
        html: "",
      };

      await provider.send(message);

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: "test@app.com",
        to: "john@example.com",
        subject: "Test Subject",
        html: "",
        text: undefined,
      });
    });
  });
});
