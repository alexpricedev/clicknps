import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type DashboardProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Dashboard = ({ auth, csrfToken }: DashboardProps) => (
  <Layout title="Dashboard" name="dashboard" auth={auth} csrfToken={csrfToken}>
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Dashboard</h1>
          <p className="py-6">
            Your analytics dashboard is coming soon. Get insights into your NPS
            surveys and customer feedback.
          </p>
          <button type="button" className="btn btn-primary">
            View Analytics
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
