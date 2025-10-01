import type { User } from "./auth";
import { db } from "./database";

export interface UpdateUserProfileData {
  first_name: string;
  last_name: string;
}

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const result = await db`
    SELECT id, email, business_id, first_name, last_name, created_at
    FROM users
    WHERE id = ${userId}
  `;

  if (result.length === 0) {
    return null;
  }

  const userData = result[0] as {
    id: string;
    email: string;
    business_id: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  };

  return {
    id: userData.id,
    email: userData.email,
    business_id: userData.business_id,
    first_name: userData.first_name ?? undefined,
    last_name: userData.last_name ?? undefined,
    created_at: new Date(userData.created_at),
  };
};

export const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileData,
): Promise<User> => {
  const result = await db`
    UPDATE users
    SET
      first_name = ${data.first_name},
      last_name = ${data.last_name}
    WHERE id = ${userId}
    RETURNING id, email, business_id, first_name, last_name, created_at
  `;

  const userData = result[0] as {
    id: string;
    email: string;
    business_id: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  };

  return {
    id: userData.id,
    email: userData.email,
    business_id: userData.business_id,
    first_name: userData.first_name ?? undefined,
    last_name: userData.last_name ?? undefined,
    created_at: new Date(userData.created_at),
  };
};
