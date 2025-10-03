import { isAdminOrOwner } from "../../middleware/access";
import { getAuthContext, requireAuth } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken, verifyCsrfToken } from "../../services/csrf";
import { getEmailService } from "../../services/email";
import {
  getBusinessMembers,
  getPendingInvites,
  inviteUser,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "../../services/team";
import type { TeamState } from "../../templates/team";
import { Team } from "../../templates/team";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const teamStateHelpers = stateHelpers<TeamState>();

export const team = {
  async index(req: Request): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);

    if (!auth.user || !auth.business) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check admin access
    if (!isAdminOrOwner(auth)) {
      return redirect("/");
    }

    if (req.method === "POST") {
      return await handleTeamActions(req, auth.user.id, auth.business.id);
    }

    const url = new URL(req.url);
    const state = teamStateHelpers.parseState(url);

    const [members, invites, csrfToken, teamCsrfToken] = await Promise.all([
      getBusinessMembers(auth.business.id),
      getPendingInvites(auth.business.id),
      generateLogoutCsrfToken(req),
      generateTeamCsrfToken(req),
    ]);

    return render(
      <Team
        auth={auth}
        csrfToken={csrfToken}
        members={members}
        invites={invites}
        state={state}
        teamCsrfToken={teamCsrfToken}
      />,
    );
  },
};

async function handleTeamActions(
  req: Request,
  userId: string,
  businessId: string,
): Promise<Response> {
  const formData = await req.formData();
  const action = formData.get("action") as string;
  const csrfToken = formData.get("_csrf") as string;

  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId || !csrfToken) {
    return createErrorResponse("Invalid request");
  }

  const isValidCsrf = await verifyCsrfToken(
    sessionId,
    "POST",
    "/settings/team",
    csrfToken,
  );
  if (!isValidCsrf) {
    return createErrorResponse("Invalid security token");
  }

  try {
    switch (action) {
      case "invite": {
        const email = formData.get("email") as string;
        const role = formData.get("role") as string;

        if (!email || !email.includes("@")) {
          return createErrorResponse("Valid email is required");
        }

        if (role !== "admin" && role !== "member") {
          return createErrorResponse("Invalid role");
        }

        const { rawToken } = await inviteUser(businessId, email, role, userId);

        const url = new URL(req.url);
        const inviteUrl = `${url.protocol}//${url.host}/invites/accept?token=${rawToken}`;

        const emailService = getEmailService();
        const auth = await getAuthContext(req);

        const inviterName =
          auth.user?.first_name && auth.user?.last_name
            ? `${auth.user.first_name} ${auth.user.last_name}`
            : undefined;

        await emailService.sendTeamInvite({
          to: { email },
          inviteUrl,
          businessName: auth.business?.business_name || "Your Team",
          role,
          invitedByName: inviterName,
        });

        return redirect(
          teamStateHelpers.buildRedirectUrlWithState("/settings/team", {
            success: `Invitation sent to ${email}`,
          }),
        );
      }

      case "change_role": {
        const targetUserId = formData.get("userId") as string;
        const newRole = formData.get("role") as string;

        if (!targetUserId || !newRole) {
          return createErrorResponse("Missing required fields");
        }

        if (newRole !== "admin" && newRole !== "member") {
          return createErrorResponse("Invalid role");
        }

        await updateMemberRole(targetUserId, businessId, newRole, userId);

        return redirect(
          teamStateHelpers.buildRedirectUrlWithState("/settings/team", {
            success: "Member role updated successfully",
          }),
        );
      }

      case "remove": {
        const targetUserId = formData.get("userId") as string;

        if (!targetUserId) {
          return createErrorResponse("Missing user ID");
        }

        await removeMember(targetUserId, businessId, userId);

        return redirect(
          teamStateHelpers.buildRedirectUrlWithState("/settings/team", {
            success: "Member removed successfully",
          }),
        );
      }

      case "revoke": {
        const inviteId = formData.get("inviteId") as string;

        if (!inviteId) {
          return createErrorResponse("Missing invite ID");
        }

        await revokeInvite(inviteId, businessId, userId);

        return redirect(
          teamStateHelpers.buildRedirectUrlWithState("/settings/team", {
            success: "Invitation revoked successfully",
          }),
        );
      }

      default:
        return createErrorResponse("Invalid action");
    }
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "An error occurred",
    );
  }
}

function createErrorResponse(error: string): Response {
  return redirect(
    teamStateHelpers.buildRedirectUrlWithState("/settings/team", { error }),
  );
}

async function generateLogoutCsrfToken(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  return await createCsrfToken(sessionId, "POST", "/auth/logout");
}

async function generateTeamCsrfToken(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  return await createCsrfToken(sessionId, "POST", "/settings/team");
}
