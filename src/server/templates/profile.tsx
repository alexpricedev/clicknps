import { AlertTriangle, CheckCircle } from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";

export interface ProfileState {
  success?: boolean;
  error?: string;
}

export type ProfileProps = {
  auth: AuthContext;
  state?: ProfileState;
  updateCsrfToken: string | null;
  csrfToken: string | null;
};

export const Profile = (props: ProfileProps): JSX.Element => {
  return (
    <Layout
      title="Profile"
      name="profile"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="Profile Settings"
          description="Update your personal information"
        />

        <div className="card bg-neutral text-neutral-content max-w-2xl">
          <div className="card-body">
            <form
              method="POST"
              action="/settings/profile"
              className="space-y-6"
            >
              <CsrfField token={props.updateCsrfToken} />

              {props.state?.success && (
                <Alert
                  type="success"
                  icon={<CheckCircle className="w-6 h-6" />}
                  title="Profile updated successfully"
                />
              )}

              {props.state?.error && (
                <Alert
                  type="error"
                  icon={<AlertTriangle className="w-6 h-6" />}
                  title={props.state.error}
                />
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">First Name *</legend>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  placeholder="John"
                  required
                  minLength={1}
                  maxLength={100}
                  defaultValue={props.auth.user?.first_name ?? ""}
                  className="input w-full"
                />
                <p className="label">Your first name (1-100 characters).</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Last Name *</legend>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  required
                  minLength={1}
                  maxLength={100}
                  defaultValue={props.auth.user?.last_name ?? ""}
                  className="input w-full"
                />
                <p className="label">Your last name (1-100 characters).</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Email</legend>
                <input
                  type="email"
                  id="email"
                  name="email"
                  disabled
                  value={props.auth.user?.email ?? ""}
                  className="input w-full"
                />
                <p className="label">Email cannot be changed at this time.</p>
              </fieldset>

              <div className="pt-4">
                <button type="submit" className="btn btn-primary">
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
