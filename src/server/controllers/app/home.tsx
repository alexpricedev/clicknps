import { getAuthContext } from "../../middleware/auth";
import {
  getDashboardStats,
  getLatestResponses,
  getVisitorStats,
  getWeeklyNpsData,
} from "../../services/analytics";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import { Dashboard } from "../../templates/dashboard";
import { Home } from "../../templates/home";
import { render } from "../../utils/response";

export const home = {
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

    if (auth.isAuthenticated && auth.business) {
      const [dashboardStats, latestResponses, weeklyNpsData] =
        await Promise.all([
          getDashboardStats(auth.business.id),
          getLatestResponses(auth.business.id, 6),
          getWeeklyNpsData(auth.business.id, 12),
        ]);

      return render(
        <Dashboard
          auth={auth}
          csrfToken={csrfToken}
          stats={dashboardStats}
          latestResponses={latestResponses}
          weeklyNpsData={weeklyNpsData}
        />,
      );
    }

    const stats = getVisitorStats();

    return render(
      <Home
        method={req.method}
        stats={stats}
        auth={auth}
        csrfToken={csrfToken}
      />,
    );
  },
};
