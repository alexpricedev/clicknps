import { requireAuth } from "../../middleware/auth";

export const dashboard = {
  async index(req: Request): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    return new Response("", {
      status: 303,
      headers: { Location: "/" },
    });
  },
};
