import { AlertTriangle, Mail } from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { BaseLayout } from "../components/layouts";
import type { Business } from "../services/business";
import type { BusinessInvite } from "../services/team";

export interface InviteAcceptState {
  error?: string;
}

export type InviteAcceptProps = {
  state?: InviteAcceptState;
  csrfToken: string | null;
  invite: BusinessInvite | null;
  business: Business | null;
  token: string | null;
};

export const InviteAccept = (props: InviteAcceptProps): JSX.Element => {
  if (!props.invite || !props.business) {
    return (
      <BaseLayout title="Invalid Invite" name="invite-accept">
        <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
          <div className="card bg-neutral text-neutral-content max-w-md w-full">
            <div className="card-body">
              <h1 className="card-title text-2xl mb-4">Invalid Invitation</h1>

              {props.state?.error && (
                <Alert
                  type="error"
                  icon={<AlertTriangle className="w-6 h-6" />}
                  title={props.state.error}
                />
              )}

              <p className="mt-4">
                This invitation link is invalid or has expired. Please contact
                the person who invited you for a new invitation.
              </p>

              <div className="mt-6">
                <a href="/" className="btn btn-primary w-full">
                  Go to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title="Accept Invitation" name="invite-accept">
      <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
        <div className="card bg-neutral text-neutral-content max-w-2xl w-full">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-8 h-8 text-primary" />
              <h1 className="card-title text-2xl">You've Been Invited!</h1>
            </div>

            <div className="bg-base-300 rounded-lg p-4 mb-6">
              <p className="text-sm mb-2">
                You've been invited to join the ClickNPS business:
              </p>
              <p className="text-xl font-bold">
                {props.business.business_name}
              </p>
            </div>

            {props.state?.error && (
              <div className="mb-6">
                <Alert
                  type="error"
                  icon={<AlertTriangle className="w-6 h-6" />}
                  title={props.state.error}
                />
              </div>
            )}

            <form method="POST" action="/invites/accept">
              <CsrfField token={props.csrfToken} />
              <input type="hidden" name="token" value={props.token || ""} />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">First Name *</legend>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  required
                  minLength={1}
                  maxLength={100}
                  className="input w-full"
                />
                <p className="label">Your first name.</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Last Name *</legend>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  required
                  minLength={1}
                  maxLength={100}
                  className="input w-full"
                />
                <p className="label">Your last name.</p>
              </fieldset>

              <div className="bg-base-300 rounded-lg p-4 mt-4">
                <p className="text-sm opacity-80">
                  By accepting this invitation, you'll create an account with{" "}
                  <strong>{props.invite.email}</strong> and be added to the{" "}
                  <strong>{props.business.business_name}</strong> ClickNPS
                  account.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Accept Invitation & Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};
