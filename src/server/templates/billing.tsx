import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type BillingProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Billing = ({ auth, csrfToken }: BillingProps) => (
  <Layout
    title="Billing & Usage"
    name="billing"
    auth={auth}
    csrfToken={csrfToken}
  >
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Billing & Usage</h1>
          <p className="py-6">
            Track your usage and manage billing preferences. Advanced billing
            features coming soon.
          </p>
          <button type="button" className="btn btn-primary">
            View Usage
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
