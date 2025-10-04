import {
  CheckCircle,
  MessageSquare,
  Percent,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";
import type { Survey, SurveyStats } from "../services/surveys";

export interface SurveysState {
  created?: {
    surveyId: string;
    title: string;
  };
}

type SurveysProps = {
  surveys: Survey[];
  stats: SurveyStats[];
  state?: SurveysState;
  auth: AuthContext;
  csrfToken?: string | null;
};

export const Surveys = (props: SurveysProps): JSX.Element => {
  return (
    <Layout
      title="Surveys - ClickNPS"
      description="Manage your NPS surveys, view responses, and generate survey links for different subjects."
      name="surveys"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="Your Surveys"
          description="Manage your NPS surveys, view responses, and manually generate links for different subjects."
        >
          <a href="/surveys/new" className="btn btn-primary">
            <Plus size={24} />
            Create Survey
          </a>
        </PageHeader>

        {props.state?.created && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title={`Survey "${props.state.created.title}" (ID: ${props.state.created.surveyId}) created successfully!`}
              description="You can now mint links for different subjects using this survey."
            />
          </div>
        )}

        {props.surveys.length > 0 ? (
          <ul className="list bg-neutral rounded-box shadow-md">
            {props.surveys.map((survey) => {
              const surveyStats = props.stats.find(
                (s) => s.survey_id === survey.id,
              );
              const responseCount = surveyStats?.response_count || 0;
              const commentCount = surveyStats?.comment_count || 0;
              const avgNPS = surveyStats?.average_nps;
              const responseRate = surveyStats?.response_rate ?? null;

              // NPS color coding: 0-6 (red), 7-8 (yellow), 9-10 (green)
              const getNPSColor = (score: number | null) => {
                if (score === null) return "text-base-content/60";
                if (score <= 6) return "text-error";
                if (score <= 8) return "text-warning";
                return "text-success";
              };

              // Response rate color coding: <30% (red), 30-70% (yellow), >70% (green)
              const getResponseRateColor = (rate: number | null) => {
                if (rate === null) return "text-base-content/60";
                if (rate < 30) return "text-error";
                if (rate < 70) return "text-warning";
                return "text-success";
              };

              return (
                <li key={survey.id} className="list-row">
                  {/* Main content area */}
                  <div className="list-col-grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-base-content truncate flex items-center">
                          <a
                            href={`/surveys/${survey.survey_id}/responses`}
                            className="link link-hover"
                          >
                            {survey.title}
                          </a>
                          <span className="font-normal text-xs text-accent font-mono ml-2 inline-block">
                            {survey.survey_id}
                          </span>
                        </div>
                        {survey.description && (
                          <div className="text-sm opacity-80 mt-1 line-clamp-2">
                            {survey.description}
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{responseCount} responses</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{commentCount} comments</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className={getNPSColor(avgNPS ?? null)}>
                              NPS:{" "}
                              {avgNPS !== null && avgNPS !== undefined
                                ? avgNPS.toFixed(1)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            <span
                              className={getResponseRateColor(responseRate)}
                            >
                              Response Rate:{" "}
                              {responseRate !== null ? `${responseRate}%` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs opacity-60">
                          <span>TTL: {survey.ttl_days} days</span>
                          <span>
                            Created:{" "}
                            {new Date(survey.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons - responsive layout */}
                      <div className="join join-vertical lg:join-horizontal">
                        <a
                          href={`/surveys/${survey.survey_id}/mint`}
                          className="btn btn-sm join-item"
                        >
                          Mint Links Manually
                        </a>
                        <a
                          href={`/surveys/${survey.survey_id}/responses`}
                          className="btn btn-sm btn-secondary join-item"
                        >
                          View Responses
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="hero bg-base-200 rounded-box p-8 max-w-md mx-auto">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <div className="mb-4">
                    <TrendingUp className="w-16 h-16 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No surveys yet</h3>
                  <p className="mb-6 opacity-80">
                    Create your first survey to start generating NPS links and
                    tracking customer satisfaction.
                  </p>
                  <a href="/surveys/new" className="btn btn-primary">
                    <Plus className="w-4 h-4" />
                    Create Your First Survey
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
