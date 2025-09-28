import { Plus } from "lucide-react";
import type { JSX } from "react";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";
import type { Survey } from "../services/surveys";

export interface SurveysState {
  created?: {
    surveyId: string;
    title: string;
  };
}

type SurveysProps = {
  surveys: Survey[];
  state?: SurveysState;
  auth: AuthContext;
  csrfToken?: string | null;
};

export const Surveys = (props: SurveysProps): JSX.Element => {
  return (
    <Layout
      title="Surveys"
      name="surveys"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Your Surveys"
          description="Manage your NPS surveys and generate links for different subjects."
        >
          <a href="/surveys/new" className="btn btn-primary">
            <Plus size={24} />
            Create Survey
          </a>
        </PageHeader>

        {props.state?.created && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
            <p className="font-semibold">
              ✅ Survey "{props.state.created.title}" (ID:{" "}
              {props.state.created.surveyId}) created successfully!
            </p>
            <p className="text-sm mt-1">
              You can now mint links for different subjects using this survey.
            </p>
          </div>
        )}

        {props.surveys.length > 0 ? (
          <div className="grid gap-4">
            {props.surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {survey.title || "Untitled Survey"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      ID:{" "}
                      <code className="bg-gray-100 px-1 rounded">
                        {survey.survey_id}
                      </code>
                    </p>
                    {survey.description && (
                      <p className="text-sm text-gray-700 mb-3">
                        {survey.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Default TTL: {survey.ttl_days} days</span>
                      <span>
                        Created:{" "}
                        {new Date(survey.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <a
                      href={`/surveys/${survey.survey_id}/responses`}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      View Responses
                    </a>
                    <a
                      href={`/surveys/${survey.survey_id}/mint`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Mint Links
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No surveys yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first survey to start generating NPS links.
              </p>
              <a
                href="/surveys/new"
                className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Your First Survey
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
