import { redirectIfAuthenticated } from "../../middleware/auth";
import { createSignUpMagicLink, findUser } from "../../services/auth";
import { getEmailService } from "../../services/email";
import type { SignupState } from "../../templates/signup";
import { Signup } from "../../templates/signup";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const { parseState, buildRedirectUrlWithState: redirectWithState } =
  stateHelpers<SignupState>();

export const signup = {
  async index(req: Request): Promise<Response> {
    const authRedirect = await redirectIfAuthenticated(req);
    if (authRedirect) return authRedirect;

    const url = new URL(req.url);
    const state = parseState(url);

    return render(<Signup state={state} />);
  },

  async create(req: Request): Promise<Response> {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const businessName = formData.get("businessName") as string;

    if (!email || !email.includes("@")) {
      return redirect(
        redirectWithState("/signup", {
          validationError: true,
          error: "Invalid email address",
        }),
      );
    }

    if (!businessName || businessName.trim().length === 0) {
      return redirect(
        redirectWithState("/signup", {
          validationError: true,
          error: "Business name is required",
        }),
      );
    }

    try {
      const existingUser = await findUser(email.toLowerCase().trim());

      if (existingUser) {
        return redirect(
          redirectWithState("/signup", {
            validationError: true,
            error:
              "An account with this email already exists. Please sign in instead.",
          }),
        );
      }

      const { user, rawToken } = await createSignUpMagicLink(
        email.toLowerCase().trim(),
        businessName.trim(),
      );

      const url = new URL(req.url);
      const magicLinkUrl = `${url.protocol}//${url.host}/auth/callback?token=${rawToken}`;

      const emailService = getEmailService();
      await emailService.sendMagicLink({
        to: { email: user.email },
        magicLinkUrl,
        expiryMinutes: 15,
      });

      return redirect(redirectWithState("/signup", { emailSent: true }));
    } catch {
      return redirect(
        redirectWithState("/signup", {
          validationError: true,
          error: "Something went wrong. Please try again.",
        }),
      );
    }
  },
};
