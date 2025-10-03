import { redirectIfAuthenticated } from "../../middleware/auth";
import { createSignInMagicLink } from "../../services/auth";
import { getEmailService } from "../../services/email";
import type { LoginState } from "../../templates/login";
import { Login } from "../../templates/login";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const loginStateHelpers = stateHelpers<LoginState>();

export const login = {
  async index(req: Request): Promise<Response> {
    const authRedirect = await redirectIfAuthenticated(req);
    if (authRedirect) return authRedirect;

    const url = new URL(req.url);
    const state = loginStateHelpers.parseState(url);

    return render(<Login state={state} />);
  },

  async create(req: Request): Promise<Response> {
    const formData = await req.formData();
    const email = formData.get("email") as string;

    if (!email || !email.includes("@")) {
      return redirect(
        loginStateHelpers.buildRedirectUrlWithState("/login", {
          validationError: true,
          error: "Invalid email address",
        }),
      );
    }

    try {
      const result = await createSignInMagicLink(email.toLowerCase().trim());

      if (!result) {
        return redirect(
          loginStateHelpers.buildRedirectUrlWithState("/login", {
            validationError: true,
            error:
              "No account found with this email address. Please sign up first.",
          }),
        );
      }

      const { user, rawToken } = result;

      const url = new URL(req.url);
      const magicLinkUrl = `${url.protocol}//${url.host}/auth/callback?token=${rawToken}`;

      const emailService = getEmailService();
      await emailService.sendMagicLink({
        to: { email: user.email },
        magicLinkUrl,
        expiryMinutes: 15,
      });

      return redirect(
        loginStateHelpers.buildRedirectUrlWithState("/login", {
          emailSent: true,
        }),
      );
    } catch {
      return redirect(
        loginStateHelpers.buildRedirectUrlWithState("/login", {
          validationError: true,
          error: "Something went wrong. Please try again.",
        }),
      );
    }
  },
};
