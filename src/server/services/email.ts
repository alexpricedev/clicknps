export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress;
  from: EmailAddress;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export interface MagicLinkEmailData {
  to: EmailAddress;
  magicLinkUrl: string;
  expiryMinutes: number;
}

export interface TeamInviteEmailData {
  to: EmailAddress;
  inviteUrl: string;
  businessName: string;
  role: string;
  invitedByName?: string;
}

export interface SupportRequestEmailData {
  userEmail: string;
  userName: string;
  businessName: string;
  subject: string;
  message: string;
}

export class EmailService {
  constructor(private provider: EmailProvider) {}

  async sendMagicLink(data: MagicLinkEmailData): Promise<void> {
    const fromEmail = process.env.FROM_EMAIL || "test@test.com";
    const fromName = process.env.FROM_NAME || "Test";

    const message: EmailMessage = {
      to: data.to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: "Sign in to ClickNPS",
      html: this.renderMagicLinkTemplate(data),
      text: this.renderMagicLinkText(data),
    };

    await this.provider.send(message);
  }

  async sendTeamInvite(data: TeamInviteEmailData): Promise<void> {
    const fromEmail = process.env.FROM_EMAIL || "test@test.com";
    const fromName = process.env.FROM_NAME || "Test";

    const message: EmailMessage = {
      to: data.to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: `You've been invited to join ${data.businessName} on ClickNPS`,
      html: this.renderTeamInviteTemplate(data),
      text: this.renderTeamInviteText(data),
    };

    await this.provider.send(message);
  }

  async sendSupportRequest(data: SupportRequestEmailData): Promise<void> {
    const fromEmail = process.env.FROM_EMAIL || "test@test.com";
    const fromName = process.env.FROM_NAME || "Test";

    const message: EmailMessage = {
      to: {
        email: "support@clicknps.com",
        name: "ClickNPS Support",
      },
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: `Support Request: ${data.subject}`,
      html: this.renderSupportRequestTemplate(data),
      text: this.renderSupportRequestText(data),
    };

    await this.provider.send(message);
  }

  private renderMagicLinkTemplate(data: MagicLinkEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ${process.env.APP_NAME || "ClickNPS"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #2563eb; margin: 0;">${process.env.APP_NAME || "ClickNPS"}</h1>
    </div>
    
    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="margin-top: 0; color: #1f2937;">Sign in to your account</h2>
      <p style="margin-bottom: 30px; color: #4b5563;">
        Click the button below to sign in to your account. This link will expire in ${data.expiryMinutes} minutes.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.magicLinkUrl}" 
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
          Sign in to ${process.env.APP_NAME || "ClickNPS"}
        </a>
      </div>
      
      <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${data.magicLinkUrl}</a>
      </p>
    </div>
    
    <div style="text-align: center; color: #6b7280; font-size: 14px;">
      <p>If you didn't request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderMagicLinkText(data: MagicLinkEmailData): string {
    return `Sign in to ${process.env.APP_NAME || "ClickNPS"}

Click the link below to sign in to your account:
${data.magicLinkUrl}

This link will expire in ${data.expiryMinutes} minutes.

If you didn't request this email, you can safely ignore it.`;
  }

  private renderTeamInviteTemplate(data: TeamInviteEmailData): string {
    const inviterText = data.invitedByName
      ? `${data.invitedByName} has invited you`
      : "You've been invited";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${data.businessName} on ${process.env.APP_NAME || "ClickNPS"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #2563eb; margin: 0;">${process.env.APP_NAME || "ClickNPS"}</h1>
    </div>

    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="margin-top: 0; color: #1f2937;">You've been invited to join a team</h2>
      <p style="margin-bottom: 20px; color: #4b5563;">
        ${inviterText} to join <strong>${data.businessName}</strong> as ${data.role === "admin" ? "an admin" : "a member"}.
      </p>

      <div style="background: #e0e7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; color: #3730a3; font-size: 14px;">
          <strong>Role:</strong> ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.inviteUrl}"
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
          Accept Invitation
        </a>
      </div>

      <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.inviteUrl}" style="color: #2563eb; word-break: break-all;">${data.inviteUrl}</a>
      </p>
    </div>

    <div style="text-align: center; color: #6b7280; font-size: 14px;">
      <p>If you didn't expect this invitation, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderTeamInviteText(data: TeamInviteEmailData): string {
    const inviterText = data.invitedByName
      ? `${data.invitedByName} has invited you`
      : "You've been invited";

    return `Join ${data.businessName} on ${process.env.APP_NAME || "ClickNPS"}

${inviterText} to join ${data.businessName} as ${data.role === "admin" ? "an admin" : "a member"}.

Role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}

Click the link below to accept the invitation:
${data.inviteUrl}

If you didn't expect this invitation, you can safely ignore it.`;
  }

  private renderSupportRequestTemplate(data: SupportRequestEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request from ${data.businessName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #2563eb; margin: 0;">${process.env.APP_NAME || "ClickNPS"}</h1>
    </div>

    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="margin-top: 0; color: #1f2937;">Support Request</h2>

      <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>From:</strong></p>
        <p style="margin: 0; color: #1f2937;">${data.userName} (${data.userEmail})</p>
      </div>

      <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Business:</strong></p>
        <p style="margin: 0; color: #1f2937;">${data.businessName}</p>
      </div>

      <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Subject:</strong></p>
        <p style="margin: 0; color: #1f2937;">${data.subject}</p>
      </div>

      <div style="background: white; padding: 20px; border-radius: 6px;">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Message:</strong></p>
        <p style="margin: 0; color: #1f2937; white-space: pre-wrap;">${data.message}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private renderSupportRequestText(data: SupportRequestEmailData): string {
    return `Support Request from ${process.env.APP_NAME || "ClickNPS"}

From: ${data.userName} (${data.userEmail})
Business: ${data.businessName}

Subject: ${data.subject}

Message:
${data.message}`;
  }
}

let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    const emailProvider = process.env.EMAIL_PROVIDER || "console";

    if (emailProvider === "resend") {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error(
          "RESEND_API_KEY environment variable is required when EMAIL_PROVIDER=resend",
        );
      }
      const { ResendProvider } = require("./email-providers/resend");
      emailServiceInstance = new EmailService(new ResendProvider(apiKey));
    } else {
      const { ConsoleLogProvider } = require("./email-providers/console");
      emailServiceInstance = new EmailService(new ConsoleLogProvider());
    }
  }
  return emailServiceInstance;
};

export const setEmailService = (service: EmailService): void => {
  emailServiceInstance = service;
};
