import { isAdminOrOwner } from "../../middleware/access";
import { getAuthContext, requireAuth } from "../../middleware/auth";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken, verifyCsrfToken } from "../../services/csrf";
import {
  getRecentWebhookDeliveries,
  getWebhookSettings,
  sendTestWebhook,
  updateWebhookSettings,
} from "../../services/webhooks";
import type { WebhookState } from "../../templates/settings-webhooks";
import { WebhookSettings } from "../../templates/settings-webhooks";
import { redirect, render } from "../../utils/response";

export const webhooks = {
  async index(req: Request): Promise<Response> {
    // Check authentication
    const authResponse = await requireAuth(req);
    if (authResponse) return authResponse;

    const auth = await getAuthContext(req);

    if (!auth.business) {
      return new Response("Business not found", { status: 404 });
    }

    // Check admin access
    if (!isAdminOrOwner(auth)) {
      return redirect("/");
    }

    if (req.method === "POST") {
      return await handleWebhookActions(req, auth.business.id);
    }

    // GET request - display the page
    const [webhookSettings, recentDeliveries, csrfToken] = await Promise.all([
      getWebhookSettings(auth.business.id),
      getRecentWebhookDeliveries(auth.business.id),
      generateCsrfToken(req),
    ]);

    return render(
      <WebhookSettings
        auth={auth}
        webhookSettings={
          webhookSettings || { webhook_url: null, webhook_secret: null }
        }
        recentDeliveries={recentDeliveries}
        csrfToken={csrfToken}
      />,
    );
  },
};

async function handleWebhookActions(
  req: Request,
  businessId: string,
): Promise<Response> {
  const formData = await req.formData();
  const action = formData.get("action") as string;
  const csrfToken = formData.get("_csrf") as string;

  // Validate CSRF token
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId || !csrfToken) {
    return createErrorResponse(req, businessId, "Invalid request");
  }

  const isValidCsrf = await verifyCsrfToken(
    sessionId,
    "POST",
    "/settings/webhooks",
    csrfToken,
  );
  if (!isValidCsrf) {
    return createErrorResponse(req, businessId, "Invalid security token");
  }

  try {
    switch (action) {
      case "update": {
        const webhookUrl = formData.get("webhook_url") as string;
        const webhookSecret = formData.get("webhook_secret") as string;

        if (!webhookUrl?.trim()) {
          return createErrorResponse(
            req,
            businessId,
            "Webhook URL is required",
          );
        }

        // Validate URL format
        try {
          new URL(webhookUrl.trim());
        } catch {
          return createErrorResponse(
            req,
            businessId,
            "Invalid webhook URL format",
          );
        }

        const result = await updateWebhookSettings(
          businessId,
          webhookUrl.trim(),
          webhookSecret?.trim() || null,
        );

        return createSuccessResponse(req, businessId, {
          updated: {
            webhook_url: result.webhook_url ?? "",
            webhook_secret: result.webhook_secret ?? "",
          },
        });
      }

      case "test": {
        const result = await sendTestWebhook(businessId);

        if (result.success) {
          return createSuccessResponse(req, businessId, {
            testSuccess: {
              statusCode: result.statusCode,
            },
          });
        }
        return createSuccessResponse(req, businessId, {
          testError: {
            statusCode: result.statusCode,
            message: result.responseBody,
          },
        });
      }

      default:
        return createErrorResponse(req, businessId, "Invalid action");
    }
  } catch (error) {
    return createErrorResponse(
      req,
      businessId,
      error instanceof Error
        ? error.message
        : "An error occurred while processing your request",
    );
  }
}

async function createSuccessResponse(
  req: Request,
  businessId: string,
  state: WebhookState,
): Promise<Response> {
  const auth = await getAuthContext(req);
  const [webhookSettings, recentDeliveries, csrfToken] = await Promise.all([
    getWebhookSettings(businessId),
    getRecentWebhookDeliveries(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <WebhookSettings
      auth={auth}
      webhookSettings={
        webhookSettings || { webhook_url: null, webhook_secret: null }
      }
      recentDeliveries={recentDeliveries}
      state={state}
      csrfToken={csrfToken}
    />,
  );
}

async function createErrorResponse(
  req: Request,
  businessId: string,
  error: string,
): Promise<Response> {
  const auth = await getAuthContext(req);
  const [webhookSettings, recentDeliveries, csrfToken] = await Promise.all([
    getWebhookSettings(businessId),
    getRecentWebhookDeliveries(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <WebhookSettings
      auth={auth}
      webhookSettings={
        webhookSettings || { webhook_url: null, webhook_secret: null }
      }
      recentDeliveries={recentDeliveries}
      state={{ error }}
      csrfToken={csrfToken}
    />,
  );
}

async function generateCsrfToken(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  return await createCsrfToken(sessionId, "POST", "/settings/webhooks");
}
