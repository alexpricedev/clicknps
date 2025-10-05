import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  type EmailMessage,
  type EmailProvider,
  EmailService,
  getEmailService,
  type MagicLinkEmailData,
  setEmailService,
  type TeamInviteEmailData,
} from "./email";

class MockEmailProvider implements EmailProvider {
  public sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sentMessages.push(message);
  }

  reset() {
    this.sentMessages = [];
  }
}

describe("Email Service", () => {
  let mockProvider: MockEmailProvider;
  let emailService: EmailService;

  beforeEach(() => {
    mockProvider = new MockEmailProvider();
    emailService = new EmailService(mockProvider);
  });

  afterAll(() => {
    mock.restore();
  });

  describe("EmailService", () => {
    test("sends magic link email with correct structure", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "test@example.com", name: "Test User" },
        magicLinkUrl: "https://example.com/auth/callback?token=abc123",
        expiryMinutes: 15,
      };

      await emailService.sendMagicLink(data);

      expect(mockProvider.sentMessages).toHaveLength(1);
      const message = mockProvider.sentMessages[0];

      expect(message.to).toEqual(data.to);
      expect(message.subject).toBe("Sign in to ClickNPS");
      expect(message.from.email).toBe(process.env.FROM_EMAIL || "");
      expect(message.from.name).toBe(process.env.FROM_NAME || "");
    });

    test("includes magic link URL in HTML content", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "user@example.com" },
        magicLinkUrl: "https://test.com/magic?token=xyz789",
        expiryMinutes: 10,
      };

      await emailService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      expect(message.html).toContain(data.magicLinkUrl);
      expect(message.html).toContain("10 minutes");
      expect(message.html).toContain("Sign in to ClickNPS");
    });

    test("includes magic link URL in text content", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "user@example.com" },
        magicLinkUrl: "https://test.com/magic?token=xyz789",
        expiryMinutes: 15,
      };

      await emailService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      expect(message.text).toBeDefined();
      expect(message.text).toContain(data.magicLinkUrl);
      expect(message.text).toContain("15 minutes");
    });

    test("handles recipient without name", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "noname@example.com" },
        magicLinkUrl: "https://example.com/auth/callback?token=test",
        expiryMinutes: 15,
      };

      await emailService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      expect(message.to.email).toBe("noname@example.com");
      expect(message.to.name).toBeUndefined();
    });

    test("uses environment variables for from address when available", async () => {
      const originalFromEmail = process.env.FROM_EMAIL;
      const originalFromName = process.env.FROM_NAME;

      process.env.FROM_EMAIL = "custom@test.com";
      process.env.FROM_NAME = "Custom App";

      const customService = new EmailService(mockProvider);
      const data: MagicLinkEmailData = {
        to: { email: "test@example.com" },
        magicLinkUrl: "https://example.com/magic",
        expiryMinutes: 15,
      };

      await customService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      expect(message.from.email).toBe("custom@test.com");
      expect(message.from.name).toBe("Custom App");

      process.env.FROM_EMAIL = originalFromEmail;
      process.env.FROM_NAME = originalFromName;
    });

    test("sends team invite email with correct structure", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "newmember@example.com", name: "New Member" },
        inviteUrl: "https://example.com/invites/accept?token=invite123",
        businessName: "Acme Corp",
        role: "member",
      };

      await emailService.sendTeamInvite(data);

      expect(mockProvider.sentMessages).toHaveLength(1);
      const message = mockProvider.sentMessages[0];

      expect(message.to).toEqual(data.to);
      expect(message.subject).toBe(
        "You've been invited to join Acme Corp on ClickNPS",
      );
      expect(message.from.email).toBe(process.env.FROM_EMAIL || "");
      expect(message.from.name).toBe(process.env.FROM_NAME || "");
    });

    test("includes invite details in HTML for member role", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite?token=mem123",
        businessName: "Test Business",
        role: "member",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.html).toContain(data.inviteUrl);
      expect(message.html).toContain("Test Business");
      expect(message.html).toContain("a member");
      expect(message.html).toContain("Member");
    });

    test("includes invite details in HTML for admin role", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "admin@example.com" },
        inviteUrl: "https://example.com/invite?token=adm123",
        businessName: "Test Business",
        role: "admin",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.html).toContain("an admin");
      expect(message.html).toContain("Admin");
    });

    test("includes inviter name in team invite when provided", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite",
        businessName: "Test Business",
        role: "member",
        invitedByName: "John Doe",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.html).toContain("John Doe has invited you");
      expect(message.text).toContain("John Doe has invited you");
    });

    test("uses generic text in team invite when inviter name not provided", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite",
        businessName: "Test Business",
        role: "member",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.html).toContain("You've been invited");
      expect(message.text).toContain("You've been invited");
    });

    test("includes team invite details in text content", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite?token=text123",
        businessName: "Test Business",
        role: "admin",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.text).toBeDefined();
      expect(message.text).toContain(data.inviteUrl);
      expect(message.text).toContain("Test Business");
      expect(message.text).toContain("an admin");
      expect(message.text).toContain("Role: Admin");
    });

    test("capitalizes role in team invite text template", async () => {
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite",
        businessName: "Test Business",
        role: "member",
      };

      await emailService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.text).toContain("Role: Member");
      expect(message.text).toContain("a member");
    });

    test("uses environment variables for from address in team invite", async () => {
      const originalFromEmail = process.env.FROM_EMAIL;
      const originalFromName = process.env.FROM_NAME;

      process.env.FROM_EMAIL = "invites@custom.com";
      process.env.FROM_NAME = "Custom Team";

      const customService = new EmailService(mockProvider);
      const data: TeamInviteEmailData = {
        to: { email: "member@example.com" },
        inviteUrl: "https://example.com/invite",
        businessName: "Test Business",
        role: "member",
      };

      await customService.sendTeamInvite(data);

      const message = mockProvider.sentMessages[0];
      expect(message.from.email).toBe("invites@custom.com");
      expect(message.from.name).toBe("Custom Team");

      process.env.FROM_EMAIL = originalFromEmail;
      process.env.FROM_NAME = originalFromName;
    });
  });

  describe("getEmailService singleton", () => {
    test("returns same instance on multiple calls", () => {
      const service1 = getEmailService();
      const service2 = getEmailService();
      expect(service1).toBe(service2);
    });

    test("allows setting custom service", () => {
      const customService = new EmailService(mockProvider);
      setEmailService(customService);

      const retrievedService = getEmailService();
      expect(retrievedService).toBe(customService);
    });

    test("uses console provider by default", () => {
      const service = getEmailService();
      expect(service).toBeDefined();
    });

    test("throws error when resend provider is selected but API key is missing", () => {
      const originalProvider = process.env.EMAIL_PROVIDER;
      const originalApiKey = process.env.RESEND_API_KEY;

      process.env.EMAIL_PROVIDER = "resend";
      delete process.env.RESEND_API_KEY;

      setEmailService(null as unknown as EmailService);

      expect(() => getEmailService()).toThrow(
        "RESEND_API_KEY environment variable is required when EMAIL_PROVIDER=resend",
      );

      process.env.EMAIL_PROVIDER = originalProvider;
      process.env.RESEND_API_KEY = originalApiKey;
      setEmailService(null as unknown as EmailService);
    });
  });

  describe("Email template rendering", () => {
    test("HTML template contains all required elements", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "template@example.com" },
        magicLinkUrl: "https://example.com/callback?token=template123",
        expiryMinutes: 20,
      };

      await emailService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      const html = message.html;

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("ClickNPS");
      expect(html).toContain("Sign in to your account");
      expect(html).toContain(data.magicLinkUrl);
      expect(html).toContain("20 minutes");
      expect(html).toContain("If you didn't request this email");
    });

    test("text template contains essential information", async () => {
      const data: MagicLinkEmailData = {
        to: { email: "text@example.com" },
        magicLinkUrl: "https://example.com/callback?token=text123",
        expiryMinutes: 30,
      };

      await emailService.sendMagicLink(data);

      const message = mockProvider.sentMessages[0];
      expect(message.text).toBeDefined();
      const text = message.text as string;

      expect(text).toContain("Sign in to ClickNPS");
      expect(text).toContain(data.magicLinkUrl);
      expect(text).toContain("30 minutes");
      expect(text).toContain("If you didn't request this email");
    });
  });
});

describe("ConsoleLogProvider", () => {
  test("console.log provider can be imported and used", async () => {
    const { ConsoleLogProvider } = await import("./email-providers/console");
    const provider = new ConsoleLogProvider();

    const originalLog = console.log;
    const logCalls: string[] = [];
    console.log = (message: string) => {
      logCalls.push(message);
    };

    const message: EmailMessage = {
      to: { email: "test@example.com", name: "Test User" },
      from: { email: "from@example.com", name: "From User" },
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
      text: "Test text",
    };

    await provider.send(message);

    console.log = originalLog;

    expect(logCalls).toHaveLength(1);
    const output = logCalls[0];
    expect(output).toContain("📧 EMAIL SEND");
    expect(output).toContain("Test User <test@example.com>");
    expect(output).toContain("From User <from@example.com>");
    expect(output).toContain("Test Subject");
    expect(output).toContain("<p>Test HTML</p>");
    expect(output).toContain("Test text");
  });
});
