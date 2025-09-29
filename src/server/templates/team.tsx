import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type TeamProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Team = ({ auth, csrfToken }: TeamProps) => (
  <Layout title="Team" name="team" auth={auth} csrfToken={csrfToken}>
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Team</h1>
          <p className="py-6">
            Collaborate with your team members. Team management and
            collaboration features coming soon.
          </p>
          <button type="button" className="btn btn-primary">
            Invite Team
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
