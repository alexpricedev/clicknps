import { getAuthContext } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { getDocNavigation, getDocPage } from "../../services/docs";
import { Docs } from "../../templates/docs";
import { render } from "../../utils/response";

export const docs = {
  async show(req: Request): Promise<Response> {
    const auth = await getAuthContext(req);

    let csrfToken: string | null = null;
    if (auth.isAuthenticated) {
      const cookieHeader = req.headers.get("cookie");
      const sessionId = getSessionIdFromCookies(cookieHeader);
      if (sessionId) {
        csrfToken = await createCsrfToken(sessionId, "POST", "/auth/logout");
      }
    }

    const url = new URL(req.url);
    const slug = url.pathname.replace(/^\/docs\/?/, "") || "index";

    const [page, navigation] = await Promise.all([
      getDocPage(slug),
      getDocNavigation(),
    ]);

    if (!page) {
      return new Response("Not Found", { status: 404 });
    }

    return render(
      <Docs
        auth={auth}
        csrfToken={csrfToken}
        page={page}
        navigation={navigation}
      />,
    );
  },
};
