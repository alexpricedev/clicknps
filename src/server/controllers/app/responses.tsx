import type { BunRequest } from "bun";
import { renderToString } from "react-dom/server";
import {
  findSurveyLinkByToken,
  hasExistingResponse,
  hasExistingResponseForSurvey,
  recordResponse,
  updateResponseComment,
} from "../../services/surveys";
import { ThankYouPage } from "../../templates/thank-you";
import { stateHelpers } from "../../utils/state";

interface ResponseState {
  commented?: boolean;
}

const { parseState, buildRedirectUrlWithState: redirectWithState } =
  stateHelpers<ResponseState>();

export const responsesController = {
  /**
   * Capture NPS response and show thank you page
   */
  async capture<T extends `${string}:token${string}`>(
    req: BunRequest<T>,
  ): Promise<Response> {
    const token = req.params.token;

    if (!token) {
      return new Response("Invalid response link", { status: 400 });
    }

    try {
      // Parse state from URL
      const url = new URL(req.url);
      const state = parseState(url);

      // Find the survey link
      const surveyLink = await findSurveyLinkByToken(token);

      if (!surveyLink) {
        return new Response("Response link not found or expired", {
          status: 404,
        });
      }

      // Check for duplicate response across all score links for this survey+subject
      const alreadyResponded = await hasExistingResponseForSurvey(
        surveyLink.survey_id,
        surveyLink.subject_id,
      );

      if (alreadyResponded) {
        // Still show thank you page but indicate already responded
        const html = renderToString(
          <ThankYouPage
            score={surveyLink.score}
            alreadyResponded={true}
            token={token}
            state={state}
          />,
        );
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Record the response
      await recordResponse(surveyLink.id);

      // Show thank you page with comment form
      const html = renderToString(
        <ThankYouPage
          score={surveyLink.score}
          alreadyResponded={false}
          token={token}
          state={state}
        />,
      );

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Error capturing response:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },

  /**
   * Add optional comment to existing response
   */
  async addComment<T extends `${string}:token${string}`>(
    req: BunRequest<T>,
  ): Promise<Response> {
    const token = req.params.token;

    if (!token) {
      return new Response("Invalid response link", { status: 400 });
    }

    try {
      const formData = await req.formData();
      const comment = formData.get("comment") as string;

      if (!comment || comment.trim().length === 0) {
        return new Response("", {
          status: 303,
          headers: { Location: `/r/${token}` },
        });
      }

      // Find the survey link
      const surveyLink = await findSurveyLinkByToken(token);

      if (!surveyLink) {
        return new Response("Response link not found or expired", {
          status: 404,
        });
      }

      // Check if response exists and update with comment
      const responseExists = await hasExistingResponse(surveyLink.id);

      if (!responseExists) {
        // Create response with comment if it doesn't exist yet
        await recordResponse(surveyLink.id, comment.trim());
      } else {
        // Update existing response with comment
        await updateResponseComment(surveyLink.id, comment.trim());
      }

      // Redirect back to thank you page with state
      const successState: ResponseState = { commented: true };
      return new Response("", {
        status: 303,
        headers: { Location: redirectWithState(`/r/${token}`, successState) },
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
