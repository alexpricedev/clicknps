import { getApiAuthContext, requireApiAuth } from "../../middleware/api-auth";
import {
  findSurvey,
  type MintLinksRequest,
  mintSurveyLinks,
} from "../../services/surveys";

export const surveysApi = {
  /**
   * Generate NPS survey links for a survey_id and subject_id
   */
  async mintLinks(req: Request): Promise<Response> {
    // Check authentication first
    const authCheck = await requireApiAuth(req);
    if (authCheck) return authCheck;

    try {
      const body = await req.json();
      const { survey_id, subject_id, ttl_days, redirect_url } = body;

      // Extract the MintLinksRequest fields
      const request: MintLinksRequest = {
        subject_id,
        ttl_days,
        redirect_url,
      };

      // Validate required fields
      if (!survey_id || !subject_id) {
        return Response.json(
          { error: "Missing required fields: survey_id and subject_id" },
          { status: 400 },
        );
      }

      // Validate survey_id format (alphanumeric, underscores, hyphens only)
      if (!/^[a-zA-Z0-9_-]+$/.test(survey_id)) {
        return Response.json(
          {
            error:
              "survey_id must contain only letters, numbers, underscores, and hyphens",
          },
          { status: 400 },
        );
      }

      // Validate subject_id format (same rules)
      if (!/^[a-zA-Z0-9_-]+$/.test(subject_id)) {
        return Response.json(
          {
            error:
              "subject_id must contain only letters, numbers, underscores, and hyphens",
          },
          { status: 400 },
        );
      }

      // Validate TTL if provided
      if (ttl_days !== undefined) {
        if (!Number.isInteger(ttl_days) || ttl_days < 1 || ttl_days > 365) {
          return Response.json(
            { error: "ttl_days must be an integer between 1 and 365" },
            { status: 400 },
          );
        }
      }

      // Get authenticated business
      const auth = await getApiAuthContext(req);
      if (!auth.business) {
        return Response.json({ error: "Business not found" }, { status: 404 });
      }

      // Find the survey (don't create)
      const survey = await findSurvey(auth.business.id, survey_id);
      if (!survey) {
        return Response.json(
          { error: "Survey not found. Please create the survey first." },
          { status: 404 },
        );
      }

      // Generate the links
      const result = await mintSurveyLinks(survey, request);

      return Response.json(result, { status: 201 });
    } catch (error) {
      console.error("Error minting links:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
