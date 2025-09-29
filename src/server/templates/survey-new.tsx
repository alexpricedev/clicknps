import type { JSX } from "react";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";

export interface SurveyNewState {
  error?: string;
}

type PublicSurveyNewProps = {
  isAuthenticated: false;
};

type AuthSurveyNewProps = {
  isAuthenticated: true;
  state?: SurveyNewState;
  createCsrfToken: string | null;
};

export type SurveyNewProps = PublicSurveyNewProps | AuthSurveyNewProps;

export const SurveyNew = (props: SurveyNewProps): JSX.Element => {
  return (
    <Layout title="Create Survey" name="survey-new">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Create New Survey</h1>
          <p className="text-gray-600">
            Create a survey to generate NPS links. You can mint links for
            different subjects after creating the survey.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
          {props.isAuthenticated ? (
            <form method="POST" action="/surveys/new" className="space-y-6">
              <CsrfField token={props.createCsrfToken} />

              {props.state?.error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  <p>{props.state.error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Survey Name *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g., Customer Satisfaction Q4 2024"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A descriptive name for your survey (2-100 characters).
                </p>
              </div>

              <div>
                <label
                  htmlFor="surveyId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Survey ID *
                </label>
                <input
                  type="text"
                  id="surveyId"
                  name="surveyId"
                  placeholder="e.g., customer-satisfaction-q4-2024"
                  required
                  pattern="^[a-z0-9_-]+$"
                  title="Survey ID can only contain lowercase letters, numbers, underscores, and hyphens"
                  style={{ textTransform: "lowercase" }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for your survey. Only lowercase letters,
                  numbers, underscores, and hyphens allowed. Cannot be changed
                  later.
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Optional description of your survey purpose and context"
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional description (up to 500 characters).
                </p>
              </div>

              <div>
                <label
                  htmlFor="ttlDays"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Default Link Expiry (Days) *
                </label>
                <input
                  type="number"
                  id="ttlDays"
                  name="ttlDays"
                  placeholder="30"
                  defaultValue={30}
                  required
                  min={1}
                  max={365}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default expiry time for links minted for this survey. Can be
                  overridden when minting links (1-365 days).
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Survey
                </button>
                <a
                  href="/surveys"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </a>
              </div>
            </form>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p>
                Please{" "}
                <a href="/login" className="underline">
                  log in
                </a>{" "}
                to create surveys.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
