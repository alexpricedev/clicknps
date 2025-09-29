import { getAuthContext, requireAuth } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { Profile } from "../../templates/profile";
import { render } from "../../utils/response";

export const profile = {
  async index(req: Request): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);

    let csrfToken: string | null = null;
    if (auth.isAuthenticated) {
      const cookieHeader = req.headers.get("cookie");
      const sessionId = getSessionIdFromCookies(cookieHeader);
      if (sessionId) {
        csrfToken = await createCsrfToken(sessionId, "POST", "/auth/logout");
      }
    }

    return render(<Profile auth={auth} csrfToken={csrfToken} />);
  },
};
