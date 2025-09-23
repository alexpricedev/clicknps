import type { JSX } from "react";
import { Layout } from "../components/layouts";
import type { Survey, SurveyResponse } from "../services/surveys";

export type SurveyResponsesState = Record<string, never>;

type PublicSurveyResponsesProps = {
  isAuthenticated: false;
};

type AuthSurveyResponsesProps = {
  isAuthenticated: true;
  survey: Survey;
  responses: SurveyResponse[];
  state?: SurveyResponsesState;
};

export type SurveyResponsesProps =
  | PublicSurveyResponsesProps
  | AuthSurveyResponsesProps;

const getScoreColor = (score: number): string => {
  if (score >= 9) return "text-green-700 bg-green-100";
  if (score >= 7) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
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
    <Layout title="Survey Responses" name="survey-responses">
      <div className="container mx-auto px-4 py-8">
        {props.isAuthenticated ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Survey Responses</h1>
                <p className="text-gray-600">
                  {props.survey.title || "Untitled Survey"} (ID:{" "}
                  {props.survey.survey_id})
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/surveys/${props.survey.survey_id}/mint`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Mint Links
                </a>
                <a
                  href="/surveys"
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Back to Surveys
                </a>
              </div>
            </div>

            {props.responses.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Response Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          NPS Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {props.responses.map((response) => (
                        <tr key={response.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(response.responded_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(
                                response.score,
                              )}`}
                            >
                              {response.score}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {response.subject_id}
                            </code>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            {response.comment ? (
                              <div
                                className="truncate"
                                title={response.comment}
                              >
                                {response.comment}
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">
                                No comment
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Total responses: {props.responses.length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No responses yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This survey hasn't received any responses yet. Mint some
                    links and share them to start collecting feedback.
                  </p>
                  <a
                    href={`/surveys/${props.survey.survey_id}/mint`}
                    className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Mint Links
                  </a>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p>
              Please{" "}
              <a href="/login" className="underline">
                log in
              </a>{" "}
              to view survey responses.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
