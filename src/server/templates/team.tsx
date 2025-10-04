import { Alert } from "@server/components/alert";
import { CsrfField } from "@server/components/csrf-field";
import { Layout } from "@server/components/layouts";
import { PageHeader } from "@server/components/page-header";
import type { AuthContext } from "@server/middleware/auth";
import {
  AlertTriangle,
  CheckCircle,
  InfoIcon,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { JSX } from "react";
import type {
  BusinessInvite,
  BusinessMember,
  UserRole,
} from "../services/team";

export interface TeamState {
  error?: string;
  success?: string;
}

type TeamProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
  members: BusinessMember[];
  invites: BusinessInvite[];
  teamCsrfToken: string | null;
  state?: TeamState;
};

export const Team = ({
  auth,
  csrfToken,
  members,
  invites,
  teamCsrfToken,
  state,
}: TeamProps): JSX.Element => {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return <span className="badge badge-primary">Owner</span>;
      case "admin":
        return <span className="badge badge-secondary">Admin</span>;
      case "member":
        return <span className="badge">Member</span>;
    }
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const days = Math.ceil(
      (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return days;
  };

  return (
    <Layout
      title="Team Management - ClickNPS"
      description="Manage team members, send invitations, and control access to your ClickNPS account."
      name="team"
      auth={auth}
      csrfToken={csrfToken}
    >
      <div>
        <PageHeader
          title="Team Management"
          description="Manage team members and send invitations to collaborate."
        />

        {state?.success && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title={state.success}
            />
          </div>
        )}

        {state?.error && (
          <div className="mb-6">
            <Alert
              type="error"
              icon={<AlertTriangle className="w-6 h-6" />}
              title={state.error}
            />
          </div>
        )}

        <div className="card bg-neutral text-neutral-content mb-4">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <UserPlus className="w-5 h-5" />
              Invite Team Member
            </h2>
            <form method="POST" action="/settings/team" className="space-y-4">
              <CsrfField token={teamCsrfToken} />
              <input type="hidden" name="action" value="invite" />

              <div className="flex flex-col lg:flex-row lg:gap-4">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Email Address *</legend>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="teammate@example.com"
                    className="input w-full"
                  />
                  <p className="label">
                    Enter the email address of the person you want to invite.
                  </p>
                </fieldset>

                <fieldset className="fieldset lg:w-64">
                  <legend className="fieldset-legend">Role *</legend>
                  <select
                    id="role"
                    name="role"
                    required
                    className="select w-full"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </fieldset>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button type="submit" className="btn btn-primary">
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </button>

                <button
                  type="button"
                  className="btn btn-soft"
                  data-action="show-roles-info"
                >
                  <InfoIcon className="w-4 h-4" />
                  Roles
                </button>
              </div>
            </form>
          </div>
        </div>

        <div
          className="card bg-neutral text-neutral-content mb-4 hidden"
          data-element="roles-info-card"
        >
          <div className="card-body">
            <h3 className="card-title text-lg mb-3">
              <Shield className="w-5 h-5" />
              Understanding Roles
            </h3>
            <div className="text-sm space-y-2">
              <p>
                <strong className="text-primary">Owner:</strong> The first user
                to create the account. Has full access and cannot be removed or
                have their role changed.
              </p>
              <p>
                <strong className="text-secondary">Admin:</strong> Has full
                access to all features including team management. Can invite
                members, manage roles, and delete users (except the owner).
              </p>
              <p>
                <strong>Member:</strong> Has access to all features except team
                management. Cannot view this page or manage other users.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <Users className="w-6 h-6 inline mr-2" />
            Team Members ({members.length})
          </h2>

          <ul className="list bg-neutral rounded-box shadow-md">
            {members.map((member) => (
              <li key={member.id} className="list-row">
                <div className="list-col-grow min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg font-semibold text-base-content">
                          {member.first_name && member.last_name
                            ? `${member.first_name} ${member.last_name}`
                            : "No name set"}
                        </div>
                        {getRoleBadge(member.role)}
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm opacity-80">{member.email}</div>
                        <div className="text-xs opacity-60">
                          Joined: {formatDate(member.created_at)}
                        </div>
                      </div>
                    </div>

                    {member.role !== "owner" && (
                      <div className="join join-vertical lg:join-horizontal">
                        {member.role === "member" && (
                          <form
                            method="POST"
                            action="/settings/team"
                            className="inline"
                          >
                            <CsrfField token={teamCsrfToken} />
                            <input
                              type="hidden"
                              name="action"
                              value="change_role"
                            />
                            <input
                              type="hidden"
                              name="userId"
                              value={member.id}
                            />
                            <input type="hidden" name="role" value="admin" />
                            <button
                              type="submit"
                              className="btn btn-sm join-item"
                              title="Promote to admin"
                            >
                              Promote to Admin
                            </button>
                          </form>
                        )}

                        {member.role === "admin" && (
                          <form
                            method="POST"
                            action="/settings/team"
                            className="inline"
                          >
                            <CsrfField token={teamCsrfToken} />
                            <input
                              type="hidden"
                              name="action"
                              value="change_role"
                            />
                            <input
                              type="hidden"
                              name="userId"
                              value={member.id}
                            />
                            <input type="hidden" name="role" value="member" />
                            <button
                              type="submit"
                              className="btn btn-sm join-item"
                              title="Demote to member"
                            >
                              Demote to Member
                            </button>
                          </form>
                        )}

                        <form
                          method="POST"
                          action="/settings/team"
                          className="inline"
                        >
                          <CsrfField token={teamCsrfToken} />
                          <input type="hidden" name="action" value="remove" />
                          <input
                            type="hidden"
                            name="userId"
                            value={member.id}
                          />
                          <button
                            type="submit"
                            className="btn btn-sm btn-error join-item"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {invites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              <Mail className="w-6 h-6 inline mr-2" />
              Pending Invitations ({invites.length})
            </h2>

            <ul className="list bg-neutral rounded-box shadow-md">
              {invites.map((invite) => (
                <li key={invite.id} className="list-row">
                  <div className="list-col-grow min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-lg font-semibold text-base-content">
                            {invite.email}
                          </div>
                          {getRoleBadge(invite.role)}
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs opacity-60">
                            Sent: {formatDate(invite.created_at)}
                          </div>
                          <div className="text-xs opacity-60">
                            Expires in {getDaysUntilExpiry(invite.expires_at)}{" "}
                            days
                          </div>
                        </div>
                      </div>

                      <form
                        method="POST"
                        action="/settings/team"
                        className="inline"
                      >
                        <CsrfField token={teamCsrfToken} />
                        <input type="hidden" name="action" value="revoke" />
                        <input
                          type="hidden"
                          name="inviteId"
                          value={invite.id}
                        />
                        <button
                          type="submit"
                          className="btn btn-sm btn-error"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                          Revoke
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
};
