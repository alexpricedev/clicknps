import type { User } from "../services/auth";
import {
  getSession,
  getSessionIdFromCookies,
  renewSession,
} from "../services/auth";
import type { Business } from "../services/business";
import { getBusiness } from "../services/business";

export interface AuthContext {
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
}

/**
 * Extract authentication context from request
 * Renews session activity for authenticated users
 */
export const getAuthContext = async (req: Request): Promise<AuthContext> => {
  const cookieHeader = req.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) {
    return { user: null, business: null, isAuthenticated: false };
  }

  try {
    const sessionData = await getSession(sessionId);

    if (!sessionData) {
      return { user: null, business: null, isAuthenticated: false };
    }

    await renewSession(sessionId);

    // Fetch business information
    const business = await getBusiness(sessionData.user.business_id);

    return {
      user: sessionData.user,
      business,
      isAuthenticated: true,
    };
  } catch {
    return { user: null, business: null, isAuthenticated: false };
  }
};

/**
 * Middleware to require authentication
 * Returns redirect response if not authenticated, null to continue
 */
export const requireAuth = async (req: Request): Promise<Response | null> => {
  const auth = await getAuthContext(req);

  if (!auth.isAuthenticated) {
    return new Response("", {
      status: 303,
      headers: { Location: "/login" },
    });
  }

  return null;
};

/**
 * Middleware to redirect authenticated users away from auth pages
 * Returns redirect response if authenticated, null to continue
 */
export const redirectIfAuthenticated = async (
  req: Request,
): Promise<Response | null> => {
  const auth = await getAuthContext(req);

  if (auth.isAuthenticated) {
    return new Response("", {
      status: 303,
      headers: { Location: "/" },
    });
  }

  return null;
};
