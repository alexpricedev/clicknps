import { getAuthContext } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { Contact } from "../../templates/contact";
import { render } from "../../utils/response";

export const contact = {
  async index(req: Request): Promise<Response> {
    const auth = await getAuthContext(req);

    let csrfToken: string | null = null;
    if (auth.isAuthenticated) {
      const cookieHeader = req.headers.get("cookie");
      const sessionId = getSessionIdFromCookies(cookieHeader);
      if (sessionId) {
        csrfToken = await createCsrfToken(sessionId, "POST", "/auth/logout");
      }
    }

    return render(<Contact auth={auth} csrfToken={csrfToken} />);
  },
};
