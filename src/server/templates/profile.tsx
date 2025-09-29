import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type ProfileProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Profile = ({ auth, csrfToken }: ProfileProps) => (
  <Layout title="Profile" name="profile" auth={auth} csrfToken={csrfToken}>
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Profile</h1>
          <p className="py-6">
            Manage your account settings and personal information. Profile
            customization coming soon.
          </p>
          <button type="button" className="btn btn-primary">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  </Layout>
);
