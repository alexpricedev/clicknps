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
import { ApiKeysSettings } from "../../templates/api-keys";
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

export const apiKeys = {
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
      return await handleApiKeyActions(req, auth.business.id);
    }

    // GET request - display the page
    const [apiKeysData, csrfToken] = await Promise.all([
      getApiKeysByBusiness(auth.business.id),
      generateCsrfToken(req),
    ]);

    return render(
      <ApiKeysSettings
        auth={auth}
        apiKeys={apiKeysData}
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
        const apiKeysData = await getApiKeysByBusiness(businessId);
        const keyToRevoke = apiKeysData.find((key) => key.id === id);

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
  const [apiKeysData, csrfToken] = await Promise.all([
    getApiKeysByBusiness(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <ApiKeysSettings
      auth={auth}
      apiKeys={apiKeysData}
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
  const [apiKeysData, csrfToken] = await Promise.all([
    getApiKeysByBusiness(businessId),
    generateCsrfToken(req),
  ]);

  return render(
    <ApiKeysSettings
      auth={auth}
      apiKeys={apiKeysData}
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
