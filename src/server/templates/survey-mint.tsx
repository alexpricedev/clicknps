import type { JSX } from "react";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import type { Survey } from "../services/surveys";

export interface SurveyMintState {
  error?: string;
  success?: {
    subjectId: string;
    links: Record<string, string>;
    expires_at: string;
  };
}

type PublicSurveyMintProps = {
  isAuthenticated: false;
};

type AuthSurveyMintProps = {
  isAuthenticated: true;
  survey: Survey;
  state?: SurveyMintState;
  createCsrfToken: string | null;
};

export type SurveyMintProps = PublicSurveyMintProps | AuthSurveyMintProps;

export const SurveyMint = (props: SurveyMintProps): JSX.Element => {
  return (
    <Layout title="Mint Survey Links" name="survey-mint">
      <div className="container mx-auto px-4 py-8">
        {props.isAuthenticated ? (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Mint Links for Survey</h1>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-lg text-gray-900 mb-1">
                  {props.survey.title || "Untitled Survey"}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  ID:{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    {props.survey.survey_id}
                  </code>
                </p>
                {props.survey.description && (
                  <p className="text-sm text-gray-700 mb-2">
                    {props.survey.description}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Default TTL: {props.survey.ttl_days} days
                </p>
              </div>
            </div>

            {props.state?.success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
                <p className="font-semibold mb-2">
                  ✅ Links generated successfully!
                </p>
                <p className="text-sm mb-4">
                  NPS links for subject "{props.state.success.subjectId}" expire
                  on{" "}
                  {new Date(
                    props.state.success.expires_at,
                  ).toLocaleDateString()}
                  .
                </p>

                <div className="bg-white border border-gray-300 rounded p-4">
                  <h3 className="font-semibold mb-3 text-gray-900">
                    Generated NPS Links (Score 0-10):
                  </h3>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(props.state.success.links).map(
                      ([score, url]) => (
                        <div key={score} className="flex items-center gap-3">
                          <span className="w-8 text-right font-mono text-gray-600">
                            {score}:
                          </span>
                          <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                            {url}
                          </code>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
              <form
                method="POST"
                action={`/surveys/${props.survey.survey_id}/mint`}
                className="space-y-6"
              >
                <CsrfField token={props.createCsrfToken} />

                {props.state?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    <p>{props.state.error}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="subjectId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Subject ID *
                  </label>
                  <input
                    type="text"
                    id="subjectId"
                    name="subjectId"
                    placeholder="e.g., user-123, customer-abc, order-456"
                    required
                    pattern="^[a-zA-Z0-9_-]+$"
                    title="Subject ID can only contain letters, numbers, underscores, and hyphens"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for who this survey is for (e.g., customer
                    ID, user ID, order ID). Only letters, numbers, underscores,
                    and hyphens.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="ttlDays"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Link Expiry (Days)
                  </label>
                  <input
                    type="number"
                    id="ttlDays"
                    name="ttlDays"
                    placeholder={props.survey.ttl_days.toString()}
                    defaultValue={props.survey.ttl_days}
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Override the default TTL for this specific set of links
                    (optional, defaults to {props.survey.ttl_days} days).
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Generate NPS Links
                  </button>
                  <a
                    href="/surveys"
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Back to Surveys
                  </a>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p>
              Please{" "}
              <a href="/login" className="underline">
                log in
              </a>{" "}
              to mint survey links.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
