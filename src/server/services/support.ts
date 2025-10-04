import { db } from "./database";

export interface SupportRequest {
  id: string;
  business_id: string;
  user_id: string;
  subject: string;
  message: string;
  created_at: Date;
}

export interface CreateSupportRequestData {
  subject: string;
  message: string;
}

export const createSupportRequest = async (
  businessId: string,
  userId: string,
  data: CreateSupportRequestData,
): Promise<SupportRequest> => {
  const [request] = await db<SupportRequest[]>`
    INSERT INTO support_requests (business_id, user_id, subject, message)
    VALUES (${businessId}, ${userId}, ${data.subject}, ${data.message})
    RETURNING *
  `;

  return request;
};
