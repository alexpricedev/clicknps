import { getAuthContext } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { Pricing } from "../../templates/pricing";
import { render } from "../../utils/response";

export const pricing = {
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

    return render(<Pricing auth={auth} csrfToken={csrfToken} />);
  },
};
