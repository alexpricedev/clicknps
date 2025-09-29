import { ArrowLeft, Calendar, MessageSquare, Users } from "lucide-react";
import type { JSX } from "react";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";
import type { Survey, SurveyResponse } from "../services/surveys";

export type SurveyResponsesState = Record<string, never>;

export type SurveyResponsesProps = {
  auth: AuthContext;
  survey: Survey;
  responses: SurveyResponse[];
  csrfToken: string | null;
  state?: SurveyResponsesState;
};

const getScoreBadgeClass = (score: number): string => {
  if (score >= 9) return "badge-success";
  if (score >= 7) return "badge-warning";
  return "badge-error";
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const SurveyResponses = (props: SurveyResponsesProps): JSX.Element => {
  return (
    <Layout
      title="Survey Responses"
      name="survey-responses"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title={
            <>
              {props.survey.title || "Untitled Survey"}
              <span className="font-normal text-lg text-accent font-mono ml-3 inline-block">
                {props.survey.survey_id}
              </span>
            </>
          }
          description="Survey Responses"
        >
          <a href="/surveys" className="btn btn-ghost">
            <ArrowLeft size={20} />
            Back to Surveys
          </a>
        </PageHeader>

        {props.responses.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Total responses: {props.responses.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>
                  {props.responses.filter((r) => r.comment).length} with
                  comments
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
              {props.responses.map((response) => (
                <div key={response.id} className="card bg-neutral shadow-md">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="card-title text-lg">
                        {response.subject_id}
                      </h3>
                      <div
                        className={`badge ${getScoreBadgeClass(response.score)} badge-lg font-bold`}
                      >
                        {response.score}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 opacity-60" />
                        <span className="opacity-80">
                          {formatDate(response.responded_at)}
                        </span>
                      </div>

                      {response.comment && (
                        <div className="pt-2 border-t border-base-300">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 opacity-60 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm opacity-90 leading-relaxed">
                                {response.comment}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="hero bg-base-200 rounded-box p-8 max-w-md mx-auto">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <div className="mb-4">
                    <MessageSquare className="w-16 h-16 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No responses yet</h3>
                  <p className="mb-6 opacity-80">
                    This survey hasn't received any responses yet. Share your
                    survey links to start collecting feedback.
                  </p>
                  <a
                    href={`/surveys/${props.survey.survey_id}/mint`}
                    className="btn btn-primary"
                  >
                    Mint Links
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
