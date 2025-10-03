import { isAdminOrOwner } from "../../middleware/access";
import { getAuthContext, requireAuth } from "../../middleware/auth";
import {
  createApiKey,
  deleteApiKey,
  getApiKeysByBusiness,
  rotateApiKey,
} from "../../services/api-keys";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken, verifyCsrfToken } from "../../services/csrf";
import {
  getRecentWebhookDeliveries,
  getWebhookSettings,
  sendTestWebhook,
  updateWebhookSettings,
} from "../../services/webhooks";
import { ApiKeysSettings } from "../../templates/settings-api-keys";
import type { WebhookState } from "../../templates/settings-webhooks";
import { WebhookSettings } from "../../templates/settings-webhooks";
import { redirect, render } from "../../utils/response";

export interface ApiKeysState {
  created?: {
    id: string;
    name: string;
    token: string;
  };
  rotated?: {
    id: string;
    name: string;
    token: string;
  };
  revoked?: {
    name: string;
  };
  error?: string;
}

export const settings = {
  async apiKeys(req: Request): Promise<Response> {
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
      return await handleApiKeyActions(req, auth.business.id);
    }

    // GET request - display the page
    const [apiKeys, csrfToken] = await Promise.all([
      getApiKeysByBusiness(auth.business.id),
      generateCsrfToken(req),
    ]);

    return render(
      <ApiKeysSettings auth={auth} apiKeys={apiKeys} csrfToken={csrfToken} />,
    );
  },

  async webhooks(req: Request): Promise<Response> {
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
      generateWebhookCsrfToken(req),
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

async function handleApiKeyActions(
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
    "/settings/api-keys",
    csrfToken,
  );
  if (!isValidCsrf) {
    return createErrorResponse(req, businessId, "Invalid security token");
  }

  try {
    switch (action) {
      case "create": {
        const name = formData.get("name") as string;
        if (!name?.trim()) {
          return createErrorResponse(req, businessId, "Name is required");
        }

        const apiKey = await createApiKey(businessId, name.trim());
        return createSuccessResponse(req, businessId, {
          created: {
            id: apiKey.id,
            name: apiKey.name,
            token: apiKey.token,
          },
        });
      }

      case "rotate": {
        const id = formData.get("id") as string;
        if (!id) {
          return createErrorResponse(req, businessId, "Invalid key ID");
        }

        const rotatedKey = await rotateApiKey(id, businessId);
        if (!rotatedKey) {
          return createErrorResponse(
            req,
            businessId,
            "Key not found or cannot be rotated",
          );
        }

        return createSuccessResponse(req, businessId, {
          rotated: {
            id: rotatedKey.id,
            name: rotatedKey.name,
            token: rotatedKey.token,
          },
        });
      }

      case "revoke": {
        const id = formData.get("id") as string;
        if (!id) {
          return createErrorResponse(req, businessId, "Invalid key ID");
        }

        // Get key name before deletion for the success message
        const apiKeys = await getApiKeysByBusiness(businessId);
        const keyToRevoke = apiKeys.find((key) => key.id === id);

        if (!keyToRevoke) {
          return createErrorResponse(req, businessId, "Key not found");
        }

        const deleted = await deleteApiKey(id, businessId);
        if (!deleted) {
          return createErrorResponse(
            req,
            businessId,
            "Key not found or already revoked",
          );
        }

        return createSuccessResponse(req, businessId, {
          revoked: {
            name: keyToRevoke.name,
          },
        });
      }

      default:
        return createErrorResponse(req, businessId, "Invalid action");
    }
  } catch (_error) {
    return createErrorResponse(
      req,
      businessId,
      "An error occurred while processing your request",
    );
  }
}

async function createSuccessResponse(
  req: Request,
  businessId: string,
  state: ApiKeysState,
): Promise<Response> {
  const auth = await getAuthContext(req);
  const [apiKeys, csrfToken] = await Promise.all([
    getApiKeysByBusiness(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <ApiKeysSettings
      auth={auth}
      apiKeys={apiKeys}
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
  const [apiKeys, csrfToken] = await Promise.all([
    getApiKeysByBusiness(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <ApiKeysSettings
      auth={auth}
      apiKeys={apiKeys}
      state={{ error }}
      csrfToken={csrfToken}
    />,
  );
}

async function generateCsrfToken(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  return await createCsrfToken(sessionId, "POST", "/settings/api-keys");
}

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
    return createWebhookErrorResponse(req, businessId, "Invalid request");
  }

  const isValidCsrf = await verifyCsrfToken(
    sessionId,
    "POST",
    "/settings/webhooks",
    csrfToken,
  );
  if (!isValidCsrf) {
    return createWebhookErrorResponse(
      req,
      businessId,
      "Invalid security token",
    );
  }

  try {
    switch (action) {
      case "update": {
        const webhookUrl = formData.get("webhook_url") as string;
        const webhookSecret = formData.get("webhook_secret") as string;

        if (!webhookUrl?.trim()) {
          return createWebhookErrorResponse(
            req,
            businessId,
            "Webhook URL is required",
          );
        }

        // Validate URL format
        try {
          new URL(webhookUrl.trim());
        } catch {
          return createWebhookErrorResponse(
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

        return createWebhookSuccessResponse(req, businessId, {
          updated: {
            webhook_url: result.webhook_url ?? "",
            webhook_secret: result.webhook_secret ?? "",
          },
        });
      }

      case "test": {
        const result = await sendTestWebhook(businessId);

        if (result.success) {
          return createWebhookSuccessResponse(req, businessId, {
            testSuccess: {
              statusCode: result.statusCode,
            },
          });
        }
        return createWebhookSuccessResponse(req, businessId, {
          testError: {
            statusCode: result.statusCode,
            message: result.responseBody,
          },
        });
      }

      default:
        return createWebhookErrorResponse(req, businessId, "Invalid action");
    }
  } catch (error) {
    return createWebhookErrorResponse(
      req,
      businessId,
      error instanceof Error
        ? error.message
        : "An error occurred while processing your request",
    );
  }
}

async function createWebhookSuccessResponse(
  req: Request,
  businessId: string,
  state: WebhookState,
): Promise<Response> {
  const auth = await getAuthContext(req);
  const [webhookSettings, recentDeliveries, csrfToken] = await Promise.all([
    getWebhookSettings(businessId),
    getRecentWebhookDeliveries(businessId),
    generateWebhookCsrfToken(req),
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

async function createWebhookErrorResponse(
  req: Request,
  businessId: string,
  error: string,
): Promise<Response> {
  const auth = await getAuthContext(req);
  const [webhookSettings, recentDeliveries, csrfToken] = await Promise.all([
    getWebhookSettings(businessId),
    getRecentWebhookDeliveries(businessId),
    generateWebhookCsrfToken(req),
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

async function generateWebhookCsrfToken(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  return await createCsrfToken(sessionId, "POST", "/settings/webhooks");
}
