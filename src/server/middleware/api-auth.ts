import type { ApiKey } from "../services/api-keys";
import { findApiKeyByToken } from "../services/api-keys";
import type { Business } from "../services/business";
import { getBusiness } from "../services/business";

export interface ApiAuthContext {
  apiKey: ApiKey | null;
  business: Business | null;
  isAuthenticated: boolean;
}

/**
 * Extract API authentication context from request
 * Looks for Bearer token in Authorization header
 */
export const getApiAuthContext = async (
  req: Request,
): Promise<ApiAuthContext> => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { apiKey: null, business: null, isAuthenticated: false };
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const apiKey = await findApiKeyByToken(token);

    if (!apiKey) {
      return { apiKey: null, business: null, isAuthenticated: false };
    }

    // Fetch business information
    const business = await getBusiness(apiKey.business_id);

    return {
      apiKey,
      business,
      isAuthenticated: true,
    };
  } catch {
    return { apiKey: null, business: null, isAuthenticated: false };
  }
};

/**
 * Middleware to require API authentication
 * Returns error response if not authenticated, null to continue
 */
export const requireApiAuth = async (
  req: Request,
): Promise<Response | null> => {
  const auth = await getApiAuthContext(req);

  if (!auth.isAuthenticated) {
    return Response.json(
      { error: "Invalid or missing API key" },
      { status: 401 },
    );
  }

  return null;
};
