import { getAuthContext, requireAuth } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { updateUserProfile } from "../../services/users";
import type { ProfileState } from "../../templates/profile";
import { Profile } from "../../templates/profile";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const profileStateHelpers = stateHelpers<ProfileState>();

export const profile = {
  async index(req: Request): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const state = profileStateHelpers.parseState(url);

    const cookieHeader = req.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);

    let updateCsrfToken: string | null = null;
    let csrfToken: string | null = null;

    if (sessionId) {
      const [updateToken, logoutToken] = await Promise.all([
        createCsrfToken(sessionId, "POST", "/settings/profile"),
        createCsrfToken(sessionId, "POST", "/auth/logout"),
      ]);
      updateCsrfToken = updateToken;
      csrfToken = logoutToken;
    }

    return render(
      <Profile
        auth={auth}
        state={state}
        updateCsrfToken={updateCsrfToken}
        csrfToken={csrfToken}
      />,
    );
  },

  async update(req: Request): Promise<Response> {
    const authCheck = await requireAuth(req);
    if (authCheck) return authCheck;

    const csrfCheck = await csrfProtection(req, {
      path: "/settings/profile",
    });
    if (csrfCheck) return csrfCheck;

    const auth = await getAuthContext(req);
    if (!auth.user) {
      return new Response("User not found", { status: 404 });
    }

    try {
      const formData = await req.formData();
      const firstName = formData.get("first_name")?.toString()?.trim();
      const lastName = formData.get("last_name")?.toString()?.trim();

      if (!firstName || !lastName) {
        return redirect(
          profileStateHelpers.buildRedirectUrlWithState("/settings/profile", {
            error: "First name and last name are required",
          }),
        );
      }

      if (firstName.length < 1 || firstName.length > 100) {
        return redirect(
          profileStateHelpers.buildRedirectUrlWithState("/settings/profile", {
            error: "First name must be between 1 and 100 characters",
          }),
        );
      }

      if (lastName.length < 1 || lastName.length > 100) {
        return redirect(
          profileStateHelpers.buildRedirectUrlWithState("/settings/profile", {
            error: "Last name must be between 1 and 100 characters",
          }),
        );
      }

      await updateUserProfile(auth.user.id, {
        first_name: firstName,
        last_name: lastName,
      });

      return redirect(
        profileStateHelpers.buildRedirectUrlWithState("/settings/profile", {
          success: true,
        }),
      );
    } catch (_error) {
      return redirect(
        profileStateHelpers.buildRedirectUrlWithState("/settings/profile", {
          error: "Internal server error",
        }),
      );
    }
  },
};
