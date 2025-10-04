import { getAuthContext, requireAuth } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { getEmailService } from "../../services/email";
import { createSupportRequest } from "../../services/support";
import type { SupportState } from "../../templates/support";
import { Support } from "../../templates/support";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const supportStateHelpers = stateHelpers<SupportState>();

export const support = {
  async index(req: Request): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const state = supportStateHelpers.parseState(url);

    const cookieHeader = req.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);

    let submitCsrfToken: string | null = null;
    let csrfToken: string | null = null;

    if (sessionId) {
      const [submitToken, logoutToken] = await Promise.all([
        createCsrfToken(sessionId, "POST", "/settings/support"),
        createCsrfToken(sessionId, "POST", "/auth/logout"),
      ]);
      submitCsrfToken = submitToken;
      csrfToken = logoutToken;
    }

    return render(
      <Support
        auth={auth}
        state={state}
        submitCsrfToken={submitCsrfToken}
        csrfToken={csrfToken}
      />,
    );
  },

  async submit(req: Request): Promise<Response> {
    const authCheck = await requireAuth(req);
    if (authCheck) return authCheck;

    const csrfCheck = await csrfProtection(req, {
      path: "/settings/support",
    });
    if (csrfCheck) return csrfCheck;

    const auth = await getAuthContext(req);
    if (!auth.user || !auth.business) {
      return new Response("User or business not found", { status: 404 });
    }

    try {
      const formData = await req.formData();
      const subject = formData.get("subject")?.toString()?.trim();
      const message = formData.get("message")?.toString()?.trim();

      if (!subject || !message) {
        return redirect(
          supportStateHelpers.buildRedirectUrlWithState("/settings/support", {
            error: "Subject and message are required",
          }),
        );
      }

      if (subject.length < 2 || subject.length > 200) {
        return redirect(
          supportStateHelpers.buildRedirectUrlWithState("/settings/support", {
            error: "Subject must be between 2 and 200 characters",
          }),
        );
      }

      if (message.length < 10 || message.length > 2000) {
        return redirect(
          supportStateHelpers.buildRedirectUrlWithState("/settings/support", {
            error: "Message must be between 10 and 2000 characters",
          }),
        );
      }

      await createSupportRequest(auth.business.id, auth.user.id, {
        subject,
        message,
      });

      const emailService = getEmailService();
      await emailService.sendSupportRequest({
        userEmail: auth.user.email,
        userName:
          auth.user.first_name && auth.user.last_name
            ? `${auth.user.first_name} ${auth.user.last_name}`
            : auth.user.email,
        businessName: auth.business.business_name,
        subject,
        message,
      });

      return redirect(
        supportStateHelpers.buildRedirectUrlWithState("/settings/support", {
          success: true,
        }),
      );
    } catch (_error) {
      return redirect(
        supportStateHelpers.buildRedirectUrlWithState("/settings/support", {
          error: "Internal server error",
        }),
      );
    }
  },
};
