import { surveysApi } from "../controllers/api";
import { createRouteHandler } from "../utils/route-handler";

export const apiRoutes = {
  "/api/v1/links/mint": createRouteHandler({
    POST: surveysApi.mintLinks,
  }),
};
