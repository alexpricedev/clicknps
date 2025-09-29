import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type DocsProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Docs = ({ auth, csrfToken }: DocsProps) => (
  <Layout title="Documentation" name="docs" auth={auth} csrfToken={csrfToken}>
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Documentation</h1>
          <p className="py-6">
            Comprehensive documentation and guides are coming soon. Learn how to
            integrate and use ClickNPS effectively.
          </p>
          <button type="button" className="btn btn-primary">
            Get Started
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
