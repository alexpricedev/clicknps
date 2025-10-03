import { getAuthContext } from "../../middleware/auth";
import { createSession, createSessionCookie } from "../../services/auth";
import { getBusiness } from "../../services/business";
import { acceptInvite, getInviteByToken } from "../../services/team";
import type { DashboardState } from "../../templates/dashboard";
import type { InviteAcceptState } from "../../templates/invite-accept";
import { InviteAccept } from "../../templates/invite-accept";
import { computeHMAC } from "../../utils/crypto";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const inviteStateHelpers = stateHelpers<InviteAcceptState>();
const dashboardStateHelpers = stateHelpers<DashboardState>();

export const invites = {
  async acceptForm(req: Request): Promise<Response> {
    const auth = await getAuthContext(req);
    if (auth.isAuthenticated) {
      return redirect("/");
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Invalid invite link", { status: 400 });
    }

    const invite = await getInviteByToken(token);

    if (!invite) {
      const state = inviteStateHelpers.parseState(url);
      return render(
        <InviteAccept
          state={{ ...state, error: "Invalid or expired invite link" }}
          csrfToken={null}
          invite={null}
          business={null}
          token={null}
        />,
      );
    }

    const business = await getBusiness(invite.business_id);

    if (!business) {
      return new Response("Business not found", { status: 404 });
    }

    const csrfToken = computeHMAC(token);

    const state = inviteStateHelpers.parseState(url);

    return render(
      <InviteAccept
        state={state}
        csrfToken={csrfToken}
        invite={invite}
        business={business}
        token={token}
      />,
    );
  },

  async accept(req: Request): Promise<Response> {
    const auth = await getAuthContext(req);
    if (auth.isAuthenticated) {
      return redirect("/");
    }

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const csrfToken = formData.get("_csrf") as string;

    if (!token) {
      return new Response("Invalid invite link", { status: 400 });
    }

    const expectedCsrf = computeHMAC(token);
    if (csrfToken !== expectedCsrf) {
      return redirect(
        inviteStateHelpers.buildRedirectUrlWithState(
          `/invites/accept?token=${token}`,
          {
            error: "Invalid security token. Please try again.",
          },
        ),
      );
    }

    if (!firstName || !lastName) {
      return redirect(
        inviteStateHelpers.buildRedirectUrlWithState(
          `/invites/accept?token=${token}`,
          {
            error: "First name and last name are required",
          },
        ),
      );
    }

    try {
      const user = await acceptInvite(token, firstName.trim(), lastName.trim());

      const sessionId = await createSession(user.id);
      const sessionCookie = createSessionCookie(sessionId);

      const welcomeState: DashboardState = {
        success: `Welcome to your team, ${user.first_name}! Your account has been created successfully.`,
      };
      const redirectUrl = dashboardStateHelpers.buildRedirectUrlWithState(
        "/",
        welcomeState,
      );

      return new Response("", {
        status: 303,
        headers: {
          Location: redirectUrl,
          "Set-Cookie": sessionCookie,
        },
      });
    } catch (error) {
      return redirect(
        inviteStateHelpers.buildRedirectUrlWithState(
          `/invites/accept?token=${token}`,
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to accept invite. Please try again.",
          },
        ),
      );
    }
  },
};
