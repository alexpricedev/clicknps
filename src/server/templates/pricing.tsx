import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type PricingProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Pricing = ({ auth, csrfToken }: PricingProps) => (
  <Layout
    title="Pricing - ClickNPS"
    description="View our flexible pricing plans for NPS survey tools. Find the right plan that scales with your business."
    name="pricing"
    auth={auth}
    csrfToken={csrfToken}
  >
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Pricing</h1>
          <p className="py-6">
            Our pricing plans are coming soon. Stay tuned for flexible options
            that scale with your business.
          </p>
          <button type="button" className="btn btn-primary">
            Get Notified
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
