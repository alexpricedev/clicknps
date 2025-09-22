import { randomUUID } from "node:crypto";
import { computeHMAC, generateSecureToken } from "../utils/crypto";
import {
  type DatabaseMutationResult,
  hasAffectedRows,
} from "../utils/database";
import { db } from "./database";

export interface ApiKey {
  id: string;
  business_id: string;
  key_hash: string;
  name: string;
  last_used_at: Date | null;
  created_at: Date;
}

export interface ApiKeyWithToken {
  id: string;
  business_id: string;
  name: string;
  token: string; // Only available during creation
  created_at: Date;
}

/**
 * Create a new API key for a business
 * Returns the plain token only during creation (never stored)
 */
export const createApiKey = async (
  businessId: string,
  name: string,
): Promise<ApiKeyWithToken> => {
  const id = randomUUID();
  const token = `ck_${generateSecureToken(48)}`; // ck_ prefix for "clicknps"
  const keyHash = computeHMAC(token);

  const result = await db`
    INSERT INTO api_keys (id, business_id, key_hash, name) 
    VALUES (${id}, ${businessId}, ${keyHash}, ${name})
    RETURNING id, business_id, name, created_at
  `;

  const apiKey = result[0] as Omit<ApiKeyWithToken, "token">;

  return {
    ...apiKey,
    token,
  };
};

/**
 * Find API key by token and verify it
 * Updates last_used_at timestamp if found
 */
export const findApiKeyByToken = async (
  token: string,
): Promise<ApiKey | null> => {
  if (!token || !token.startsWith("ck_")) {
    return null;
  }

  try {
    const keyHash = computeHMAC(token);

    const result = await db`
      SELECT id, business_id, key_hash, name, last_used_at, created_at
      FROM api_keys 
      WHERE key_hash = ${keyHash}
    `;

    if (result.length === 0) {
      return null;
    }

    const apiKey = result[0] as ApiKey;

    // Update last_used_at timestamp
    await db`
      UPDATE api_keys 
      SET last_used_at = CURRENT_TIMESTAMP 
      WHERE id = ${apiKey.id}
    `;

    return apiKey;
  } catch {
    return null;
  }
};

/**
 * Get all API keys for a business (without tokens)
 */
export const getApiKeysByBusiness = async (
  businessId: string,
): Promise<Omit<ApiKey, "key_hash">[]> => {
  const result = await db`
    SELECT id, business_id, name, last_used_at, created_at
    FROM api_keys 
    WHERE business_id = ${businessId}
    ORDER BY created_at DESC
  `;

  return result as Omit<ApiKey, "key_hash">[];
};

/**
 * Delete an API key
 */
export const deleteApiKey = async (
  id: string,
  businessId: string,
): Promise<boolean> => {
  const result = (await db`
    DELETE FROM api_keys 
    WHERE id = ${id} AND business_id = ${businessId}
  `) as DatabaseMutationResult;

  return hasAffectedRows(result);
};

/**
 * Rotate an API key (delete old, create new with same name)
 */
export const rotateApiKey = async (
  id: string,
  businessId: string,
): Promise<ApiKeyWithToken | null> => {
  // Get the current key to preserve the name
  const existing = await db`
    SELECT name FROM api_keys 
    WHERE id = ${id} AND business_id = ${businessId}
  `;

  if (existing.length === 0) {
    return null;
  }

  const name = existing[0].name as string;

  // Delete the old key
  const deleted = await deleteApiKey(id, businessId);
  if (!deleted) {
    return null;
  }

  // Create new key with the same name
  return await createApiKey(businessId, name);
};
