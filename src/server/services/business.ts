import { db } from "./database";

export interface Business {
  id: string;
  business_name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get business by ID
 */
export const getBusiness = async (
  businessId: string,
): Promise<Business | null> => {
  // Handle invalid inputs early
  if (!businessId || typeof businessId !== "string" || !businessId.trim()) {
    return null;
  }

  try {
    const result = await db`
      SELECT id, business_name, created_at, updated_at
      FROM businesses 
      WHERE id = ${businessId}
    `;

    return result.length > 0 ? (result[0] as Business) : null;
  } catch {
    // Handle invalid UUID format or other database errors
    return null;
  }
};
