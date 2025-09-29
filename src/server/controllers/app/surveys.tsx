import type { BunRequest } from "bun";
import { getAuthContext, requireAuth } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { getSessionIdFromCookies } from "../../services/auth";
import { createCsrfToken } from "../../services/csrf";
import {
  createSurvey,
  findSurvey,
  getSurveyResponses,
  getSurveyStats,
  listSurveys,
  mintSurveyLinks,
} from "../../services/surveys";
import type { SurveyMintState } from "../../templates/survey-mint";
import { SurveyMint } from "../../templates/survey-mint";
import type { SurveyNewState } from "../../templates/survey-new";
import { SurveyNew } from "../../templates/survey-new";
import { SurveyResponses } from "../../templates/survey-responses";
import type { SurveysState } from "../../templates/surveys";
import { Surveys } from "../../templates/surveys";
import { redirect, render } from "../../utils/response";
import { stateHelpers } from "../../utils/state";

const {
  parseState: parseSurveysState,
  buildRedirectUrlWithState: buildRedirectUrlWithStateForSurvey,
} = stateHelpers<SurveysState>();
const {
  parseState: parseNewState,
  buildRedirectUrlWithState: buildRedirectUrlWithStateForSurveyNew,
} = stateHelpers<SurveyNewState>();
const {
  parseState: parseMintState,
  buildRedirectUrlWithState: buildRedirectUrlWithStateForSurveyMint,
} = stateHelpers<SurveyMintState>();

export const surveys = {
  async index(req: BunRequest): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);

    let csrfToken: string | null = null;
    if (auth.isAuthenticated) {
      const cookieHeader = req.headers.get("cookie");
      const sessionId = getSessionIdFromCookies(cookieHeader);
      if (sessionId) {
        csrfToken = await createCsrfToken(sessionId, "POST", "/auth/logout");
      }
    }

    if (!auth.business) {
      return new Response("Business not found", { status: 404 });
    }

    const url = new URL(req.url);
    const state = parseSurveysState(url);
    const [surveysList, surveysStats] = await Promise.all([
      listSurveys(auth.business.id),
      getSurveyStats(auth.business.id),
    ]);

    return render(
      <Surveys
        surveys={surveysList}
        stats={surveysStats}
        state={state}
        auth={auth}
        csrfToken={csrfToken}
      />,
    );
  },

  async new(req: BunRequest): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const state = parseNewState(url);

    let createCsrfTokenValue: string | null = null;
    let csrfToken: string | null = null;

    const cookieHeader = req.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);
    if (sessionId) {
      const [createToken, logoutToken] = await Promise.all([
        createCsrfToken(sessionId, "POST", "/surveys/new"),
        createCsrfToken(sessionId, "POST", "/auth/logout"),
      ]);
      createCsrfTokenValue = createToken;
      csrfToken = logoutToken;
    }

    return render(
      <SurveyNew
        auth={auth}
        state={state}
        createCsrfToken={createCsrfTokenValue}
        csrfToken={csrfToken}
      />,
    );
  },

  async create(req: BunRequest): Promise<Response> {
    const authCheck = await requireAuth(req);
    if (authCheck) return authCheck;

    const csrfCheck = await csrfProtection(req, { path: "/surveys/new" });
    if (csrfCheck) return csrfCheck;

    try {
      const formData = await req.formData();
      const title = formData.get("title")?.toString()?.trim();
      const description =
        formData.get("description")?.toString()?.trim() || undefined;
      const surveyId = formData
        .get("surveyId")
        ?.toString()
        ?.trim()
        ?.toLowerCase();
      const ttlDaysStr = formData.get("ttlDays")?.toString()?.trim();

      // Validate required fields
      if (!title || !surveyId || !ttlDaysStr) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error: "Missing required fields",
          }),
        );
      }

      // Validate title length
      if (title.length < 2 || title.length > 100) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error: "Survey name must be between 2 and 100 characters",
          }),
        );
      }

      // Validate survey ID format (lowercase letters, numbers, underscores, and hyphens)
      if (!/^[a-z0-9_-]+$/.test(surveyId)) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error:
              "Survey ID must contain only lowercase letters, numbers, underscores, and hyphens",
          }),
        );
      }

      // Parse and validate TTL days
      const ttlDays = Number.parseInt(ttlDaysStr, 10);
      if (Number.isNaN(ttlDays) || ttlDays < 1 || ttlDays > 365) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error: "TTL days must be a number between 1 and 365",
          }),
        );
      }

      // Validate description length if provided
      if (description && description.length > 500) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error: "Description must be less than 500 characters",
          }),
        );
      }

      const auth = await getAuthContext(req);
      if (!auth.business) {
        return new Response("Business not found", { status: 404 });
      }

      // Check if survey ID already exists
      const existingSurvey = await findSurvey(auth.business.id, surveyId);
      if (existingSurvey) {
        return redirect(
          buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
            error: "A survey with this ID already exists",
          }),
        );
      }

      // Create the survey
      await createSurvey(auth.business.id, surveyId, {
        title,
        description,
        ttl_days: ttlDays,
      });

      const successState: SurveysState = {
        created: {
          surveyId,
          title,
        },
      };

      return redirect(
        buildRedirectUrlWithStateForSurvey("/surveys", successState),
      );
    } catch (_error) {
      return redirect(
        buildRedirectUrlWithStateForSurveyNew("/surveys/new", {
          error: "Internal server error",
        }),
      );
    }
  },

  async mintForm<T extends `${string}:surveyId${string}`>(
    req: BunRequest<T>,
  ): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);
    const sessionId = getSessionIdFromCookies(req.headers.get("cookie"));

    let csrfToken: string | null = null;
    let createCsrfTokenValue: string | null = null;

    if (!auth.business) {
      return new Response("Business not found", { status: 404 });
    }

    const surveyId = req.params.surveyId;
    const survey = await findSurvey(auth.business.id, surveyId);

    if (!survey) {
      return new Response("Survey not found", {
        status: 404,
        headers: { "content-type": "text/html" },
      });
    }

    if (sessionId) {
      const [createToken, logoutToken] = await Promise.all([
        createCsrfToken(sessionId, "POST", `/surveys/${surveyId}/mint`),
        createCsrfToken(sessionId, "POST", "/auth/logout"),
      ]);
      createCsrfTokenValue = createToken;
      csrfToken = logoutToken;
    }

    const state = parseMintState(new URL(req.url));

    return render(
      <SurveyMint
        auth={auth}
        survey={survey}
        state={state}
        createCsrfToken={createCsrfTokenValue}
        csrfToken={csrfToken}
      />,
    );
  },

  async mint<T extends `${string}:surveyId${string}`>(
    req: BunRequest<T>,
  ): Promise<Response> {
    const authCheck = await requireAuth(req);
    if (authCheck) return authCheck;

    const surveyId = req.params.surveyId;

    const csrfCheck = await csrfProtection(req, {
      path: `/surveys/${surveyId}/mint`,
    });
    if (csrfCheck) return csrfCheck;

    try {
      const formData = await req.formData();
      const subjectId = formData.get("subjectId")?.toString()?.trim();
      const ttlDaysStr = formData.get("ttlDays")?.toString()?.trim();

      // Validate required fields
      if (!subjectId) {
        return redirect(
          buildRedirectUrlWithStateForSurveyMint(`/surveys/${surveyId}/mint`, {
            error: "Subject ID is required",
          }),
        );
      }

      // Validate subject ID format
      if (!/^[a-zA-Z0-9_-]+$/.test(subjectId)) {
        return redirect(
          buildRedirectUrlWithStateForSurveyMint(`/surveys/${surveyId}/mint`, {
            error:
              "Subject ID must contain only letters, numbers, underscores, and hyphens",
          }),
        );
      }

      // Parse TTL days if provided
      let ttlDays: number | undefined;
      if (ttlDaysStr) {
        ttlDays = Number.parseInt(ttlDaysStr, 10);
        if (Number.isNaN(ttlDays) || ttlDays < 1 || ttlDays > 365) {
          return redirect(
            buildRedirectUrlWithStateForSurveyMint(
              `/surveys/${surveyId}/mint`,
              {
                error: "TTL days must be a number between 1 and 365",
              },
            ),
          );
        }
      }

      const auth = await getAuthContext(req);
      if (!auth.business) {
        return new Response("Business not found", { status: 404 });
      }

      // Find the survey (don't create)
      const survey = await findSurvey(auth.business.id, surveyId);
      if (!survey) {
        return redirect(
          buildRedirectUrlWithStateForSurveyMint(`/surveys/${surveyId}/mint`, {
            error: "Survey not found",
          }),
        );
      }

      // Mint links for the survey
      const result = await mintSurveyLinks(survey, {
        subject_id: subjectId,
        ttl_days: ttlDays,
      });

      const successState: SurveyMintState = {
        success: {
          subjectId,
          links: result.links,
          expires_at: result.expires_at,
        },
      };

      return redirect(
        buildRedirectUrlWithStateForSurveyMint(
          `/surveys/${surveyId}/mint`,
          successState,
        ),
      );
    } catch (error) {
      // Check for our custom error message
      if (
        error instanceof Error &&
        error.message === "Links already exist for this subject"
      ) {
        return redirect(
          buildRedirectUrlWithStateForSurveyMint(`/surveys/${surveyId}/mint`, {
            error: "Links already exist for this subject",
          }),
        );
      }
      // Generic error for everything else
      return redirect(
        buildRedirectUrlWithStateForSurveyMint(`/surveys/${surveyId}/mint`, {
          error: "Internal server error",
        }),
      );
    }
  },

  async responses<T extends `${string}:surveyId${string}`>(
    req: BunRequest<T>,
  ): Promise<Response> {
    const authRequired = await requireAuth(req);
    if (authRequired) return authRequired;

    const auth = await getAuthContext(req);

    let csrfToken: string | null = null;
    if (auth.isAuthenticated) {
      const cookieHeader = req.headers.get("cookie");
      const sessionId = getSessionIdFromCookies(cookieHeader);
      if (sessionId) {
        csrfToken = await createCsrfToken(sessionId, "POST", "/auth/logout");
      }
    }

    if (!auth.business) {
      return new Response("Business not found", { status: 404 });
    }

    const surveyId = req.params.surveyId;
    const survey = await findSurvey(auth.business.id, surveyId);
    if (!survey) {
      return new Response("Survey not found", {
        status: 404,
        headers: { "content-type": "text/html" },
      });
    }

    const responses = await getSurveyResponses(survey.id);

    return render(
      <SurveyResponses
        auth={auth}
        survey={survey}
        responses={responses}
        csrfToken={csrfToken}
      />,
    );
  },
};
