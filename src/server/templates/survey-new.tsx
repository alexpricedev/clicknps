import { AlertTriangle } from "lucide-react";
import type { JSX } from "react";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";

export interface SurveyNewState {
  error?: string;
}

export type SurveyNewProps = {
  auth: AuthContext;
  state?: SurveyNewState;
  createCsrfToken: string | null;
  csrfToken: string | null;
};

export const SurveyNew = (props: SurveyNewProps): JSX.Element => {
  return (
    <Layout
      title="Create Survey"
      name="survey-new"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="Create New Survey"
          description="Create a survey to generate NPS links. You can mint links for different subjects after creating the survey."
        />

        <div className="card bg-neutral text-neutral-content max-w-2xl">
          <div className="card-body">
            <form method="POST" action="/surveys/new" className="space-y-6">
              <CsrfField token={props.createCsrfToken} />

              {props.state?.error && (
                <div className="alert alert-error">
                  <AlertTriangle className="w-6 h-6" />
                  <span>{props.state.error}</span>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Survey Name *</legend>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g., Customer Satisfaction Q4 2024"
                  required
                  minLength={2}
                  maxLength={100}
                  className="input w-full"
                />
                <p className="label">
                  A descriptive name for your survey (2-100 characters).
                </p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Survey ID *</legend>
                <input
                  type="text"
                  id="surveyId"
                  name="surveyId"
                  placeholder="e.g., customer-satisfaction-q4-2024"
                  required
                  pattern="^[a-z0-9_-]+$"
                  title="Survey ID can only contain lowercase letters, numbers, underscores, and hyphens"
                  style={{ textTransform: "lowercase" }}
                  className="input font-mono w-full"
                />
                <p className="label">
                  Unique identifier for your survey. Only lowercase letters,
                  numbers, underscores, and hyphens allowed. Cannot be changed
                  later.
                </p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Description</legend>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Optional description of your survey purpose and context"
                  rows={3}
                  maxLength={500}
                  className="textarea w-full"
                />
                <p className="label">
                  Optional description (up to 500 characters).
                </p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Default Link Expiry (Days) *
                </legend>
                <input
                  type="number"
                  id="ttlDays"
                  name="ttlDays"
                  placeholder="30"
                  defaultValue={30}
                  required
                  min={1}
                  max={365}
                  className="input"
                />
                <p className="label">
                  Default expiry time for links minted for this survey. Can be
                  overridden when minting links (1-365 days).
                </p>
              </fieldset>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="submit" className="btn btn-primary">
                  Create Survey
                </button>
                <a href="/surveys" className="btn btn-ghost">
                  Cancel
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
