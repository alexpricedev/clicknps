import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";
import type { VisitorStats } from "@server/services/analytics";

export const Home = (props: {
  method: string;
  stats: VisitorStats;
  auth: AuthContext;
  csrfToken: string | null;
}) => (
  <Layout
    title="ClickNPS - Simple NPS Surveys"
    description="Track customer satisfaction with simple NPS surveys. Generate unique survey links, track responses, and measure your Net Promoter Score."
    name="home"
    auth={props.auth}
    csrfToken={props.csrfToken}
  >
    <div className="hero min-h-[80vh]">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold mb-6">
            Track Customer Satisfaction with Simple NPS Surveys
          </h1>
          <p className="text-xl mb-8 text-base-content/70">
            ClickNPS makes it easy to collect, analyze, and act on customer
            feedback. Generate unique survey links, track responses, and measure
            your Net Promoter Score.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/signup" className="btn btn-primary btn-lg">
              Get Started Free
            </a>
            <a href="/docs" className="btn btn-outline btn-lg">
              View Docs
            </a>
          </div>
        </div>
      </div>
    </div>

    <div className="grid md:grid-cols-3 gap-8 my-16">
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Link icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Unique Survey Links
          </h2>
          <p>
            Generate pre-scored links for each NPS rating (0-10). Share via
            email or embed in your app.
          </p>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Analytics icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Real-time Analytics
          </h2>
          <p>
            Track response rates, average NPS scores, and customer comments in
            your dashboard.
          </p>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Webhook icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Webhook Integration
          </h2>
          <p>
            Get instant notifications when customers respond. Integrate with
            your existing tools.
          </p>
        </div>
      </div>
    </div>
  </Layout>
);
