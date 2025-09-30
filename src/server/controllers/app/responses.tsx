import type { BunRequest } from "bun";
import { renderToString } from "react-dom/server";
import {
  findSurveyLinkWithDetails,
  getExistingResponse,
  hasExistingResponse,
  hasExistingResponseForSurvey,
  recordResponse,
  updateResponseComment,
} from "../../services/surveys";
import {
  queueWebhookDelivery,
  refreshPendingWebhookTimer,
  updatePendingWebhookComment,
} from "../../services/webhooks";
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

      // Find the survey link with details for webhook queueing
      const linkWithDetails = await findSurveyLinkWithDetails(token);

      if (!linkWithDetails) {
        return new Response("Response link not found or expired", {
          status: 404,
        });
      }

      const { surveyLink, survey } = linkWithDetails;

      // Check for duplicate response across all score links for this survey+subject
      const alreadyResponded = await hasExistingResponseForSurvey(
        surveyLink.survey_id,
        surveyLink.subject_id,
      );

      if (alreadyResponded) {
        // Get the existing response to check timestamp
        const existingResponse = await getExistingResponse(
          surveyLink.survey_id,
          surveyLink.subject_id,
        );

        // Calculate seconds since response
        const secondsSinceResponse = existingResponse
          ? Math.floor(
              (Date.now() - existingResponse.responded_at.getTime()) / 1000,
            )
          : 999;

        // Within 180s window: allow adding comment
        const withinCommentWindow = secondsSinceResponse < 180;

        // Use the original response score, not the newly clicked link's score
        const originalScore = existingResponse?.score ?? surveyLink.score;

        // Still show thank you page but indicate already responded
        const html = renderToString(
          <ThankYouPage
            score={originalScore}
            alreadyResponded={true}
            withinCommentWindow={withinCommentWindow}
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

      // Queue webhook delivery (180s delay)
      await queueWebhookDelivery(
        survey.business_id,
        {
          survey_id: survey.survey_id,
          subject_id: surveyLink.subject_id,
          score: surveyLink.score,
          comment: null, // Will be updated if comment is added
        },
        180,
      );

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

      // Find the survey link with details for webhook updating
      const linkWithDetails = await findSurveyLinkWithDetails(token);

      if (!linkWithDetails) {
        return new Response("Response link not found or expired", {
          status: 404,
        });
      }

      const { surveyLink, survey } = linkWithDetails;

      // Check if response exists and update with comment
      const responseExists = await hasExistingResponse(surveyLink.id);

      if (!responseExists) {
        // Create response with comment if it doesn't exist yet
        await recordResponse(surveyLink.id, comment.trim());
      } else {
        // Update existing response with comment
        await updateResponseComment(surveyLink.id, comment.trim());
      }

      // Update pending webhook with comment
      await updatePendingWebhookComment(
        survey.business_id,
        survey.survey_id,
        surveyLink.subject_id,
        comment.trim(),
      );

      // Check if we're within the comment window and need to refresh webhook timer
      const existingResponse = await getExistingResponse(
        surveyLink.survey_id,
        surveyLink.subject_id,
      );

      if (existingResponse) {
        const secondsSinceResponse = Math.floor(
          (Date.now() - existingResponse.responded_at.getTime()) / 1000,
        );

        if (secondsSinceResponse < 180) {
          // Refresh the webhook timer to give another 180s from now
          await refreshPendingWebhookTimer(
            survey.business_id,
            survey.survey_id,
            surveyLink.subject_id,
            180,
          );
        }
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
