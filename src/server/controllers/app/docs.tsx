import { getAuthContext } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { Docs } from "../../templates/docs";
import { render } from "../../utils/response";

export const docs = {
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

    return render(<Docs auth={auth} csrfToken={csrfToken} />);
  },
};
