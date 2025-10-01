import { AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";
import type { Survey } from "../services/surveys";

export interface SurveyMintState {
  error?: string;
  success?: {
    subjectId: string;
    links: Record<string, string>;
    expires_at: string;
  };
}

export type SurveyMintProps = {
  auth: AuthContext;
  survey: Survey;
  state?: SurveyMintState;
  createCsrfToken: string | null;
  csrfToken: string | null;
};

export const SurveyMint = (props: SurveyMintProps): JSX.Element => {
  return (
    <Layout
      title="Mint Survey Links"
      name="survey-mint"
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
          description="Create a complete set of NPS feedback links (scores 0-10) for a specific customer or subject. Share the appropriate link based on their satisfaction level to streamline feedback collection."
        >
          <a href="/surveys" className="btn btn-ghost">
            <ArrowLeft size={20} />
            Back to Surveys
          </a>
        </PageHeader>

        {props.state?.success && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title="Links generated successfully!"
              description={`NPS links for subject "${props.state.success.subjectId}" expire on ${new Date(props.state.success.expires_at).toLocaleDateString()}.`}
            />
          </div>
        )}

        {props.state?.success && (
          <div className="card bg-neutral text-neutral-content mb-6">
            <div className="card-body">
              <h3 className="card-title mb-4">
                Generated NPS Links (Score 0-10):
              </h3>
              <div className="grid gap-2 text-sm">
                {Object.entries(props.state.success.links).map(
                  ([score, url]) => (
                    <div key={score} className="link-item relative">
                      <code
                        className="block text-xs bg-base-200 px-2 py-1 rounded pl-8 font-mono"
                        data-score={score}
                        style={
                          {
                            "--score": `"${score}:"`,
                          } as React.CSSProperties & { "--score": string }
                        }
                      >
                        {url}
                      </code>
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-base-300 mt-6">
                <a
                  href={`/surveys/${props.survey.survey_id}/mint`}
                  className="btn btn-primary"
                >
                  Mint More Links
                </a>
                <a href="/surveys" className="btn btn-ghost">
                  Back to Surveys
                </a>
              </div>
            </div>
          </div>
        )}

        {!props.state?.success && (
          <div className="card bg-neutral text-neutral-content max-w-2xl">
            <div className="card-body">
              <form
                method="POST"
                action={`/surveys/${props.survey.survey_id}/mint`}
                className="space-y-6"
              >
                <CsrfField token={props.createCsrfToken} />

                {props.state?.error && (
                  <Alert
                    type="error"
                    icon={<AlertTriangle className="w-6 h-6" />}
                    title={props.state.error}
                  />
                )}

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Subject ID *</legend>
                  <input
                    type="text"
                    id="subjectId"
                    name="subjectId"
                    placeholder="e.g., user-123, customer-abc, order-456"
                    required
                    pattern="^[a-zA-Z0-9_-]+$"
                    title="Subject ID can only contain letters, numbers, underscores, and hyphens"
                    className="input w-full"
                  />
                  <p className="label">
                    Unique identifier for who this survey is for (e.g., customer
                    ID, user ID, order ID). Only letters, numbers, underscores,
                    and hyphens.
                  </p>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Link Expiry (Days)
                  </legend>
                  <input
                    type="number"
                    id="ttlDays"
                    name="ttlDays"
                    placeholder={props.survey.ttl_days.toString()}
                    defaultValue={props.survey.ttl_days}
                    min={1}
                    max={365}
                    className="input"
                  />
                  <p className="label">
                    Override the default TTL for this specific set of links
                    (optional, defaults to {props.survey.ttl_days} days).
                  </p>
                </fieldset>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="submit" className="btn btn-primary">
                    Generate NPS Links
                  </button>
                  <a href="/surveys" className="btn btn-ghost">
                    Cancel
                  </a>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
