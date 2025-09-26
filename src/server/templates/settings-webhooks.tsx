import type { JSX } from "react";
import { Layout } from "../components/layouts";
import type { AuthContext } from "../middleware/auth";
import type { WebhookQueueItem } from "../services/webhooks";

export interface WebhookState {
  updated?: {
    webhook_url: string;
    webhook_secret: string;
  };
  testSuccess?: {
    statusCode: number;
  };
  testError?: {
    statusCode: number;
    message: string;
  };
  error?: string;
}

export interface WebhookSettingsProps {
  auth: AuthContext;
  webhookSettings: {
    webhook_url: string | null;
    webhook_secret: string | null;
  };
  recentDeliveries: WebhookQueueItem[];
  state?: WebhookState;
  csrfToken: string | null;
}

export const WebhookSettings = (props: WebhookSettingsProps): JSX.Element => {
  const { webhookSettings, recentDeliveries, state, csrfToken } = props;

  const formatSecretDisplay = (secret: string | null): string => {
    if (!secret) return "";
    if (secret.length <= 8) return secret;
    return `${secret.slice(0, 4)}${"•".repeat(secret.length - 8)}${secret.slice(-4)}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "delivered":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "processing":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return "✅";
      case "failed":
        return "❌";
      case "pending":
        return "⏳";
      case "processing":
        return "🔄";
      default:
        return "❓";
    }
  };

  return (
    <Layout
      title="Webhooks - Settings"
      name="webhooks"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="mb-4">
              <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
              <p className="text-gray-600">
                Configure webhook delivery for survey responses. Webhooks are
                sent after a 180-second delay to allow for optional comments.
              </p>
            </div>
          </div>

          {/* Success Messages */}
          {state?.updated && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">
                ✅ Webhook Settings Updated Successfully
              </h3>
              <p className="mb-3">
                Your webhook URL has been configured: <br />
                <code className="bg-green-100 px-2 py-1 rounded text-sm break-all">
                  {state.updated.webhook_url}
                </code>
              </p>
              {state.updated.webhook_secret && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">
                    Webhook Secret (copy this now - it won't be shown again):
                  </p>
                  <div className="bg-white border border-green-300 rounded p-3 mb-3">
                    <code className="text-sm break-all select-all">
                      {state.updated.webhook_secret}
                    </code>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Copy Secret
                  </button>
                </div>
              )}
            </div>
          )}

          {state?.testSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">
                ✅ Test Webhook Sent Successfully
              </h3>
              <p>
                Your endpoint responded with status code{" "}
                {state.testSuccess.statusCode}. Your webhook is working
                correctly!
              </p>
            </div>
          )}

          {state?.testError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">❌ Test Webhook Failed</h3>
              <p className="mb-2">
                Status code: {state.testError.statusCode || "No response"}
              </p>
              <p className="text-sm">Error: {state.testError.message}</p>
            </div>
          )}

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">❌ Error: {state.error}</p>
            </div>
          )}

          {/* Webhook Configuration Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Configure Webhook</h2>
            <form
              method="post"
              action="/settings/webhooks"
              className="space-y-4"
            >
              {csrfToken && (
                <input type="hidden" name="_csrf" value={csrfToken} />
              )}
              <input type="hidden" name="action" value="update" />

              <div>
                <label
                  htmlFor="webhook_url"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Webhook URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="webhook_url"
                  name="webhook_url"
                  defaultValue={webhookSettings.webhook_url || ""}
                  placeholder="https://your-app.com/api/webhooks/clicknps"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The endpoint where survey responses will be sent.
                </p>
              </div>

              <div>
                <label
                  htmlFor="webhook_secret"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Webhook Secret (optional)
                </label>
                <input
                  type="text"
                  id="webhook_secret"
                  name="webhook_secret"
                  defaultValue=""
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to verify webhook authenticity. Leave empty to
                  auto-generate a secure secret.
                  {webhookSettings.webhook_secret && (
                    <span className="block mt-1">
                      Current secret:{" "}
                      {formatSecretDisplay(webhookSettings.webhook_secret)}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Webhook Settings
                </button>
              </div>
            </form>

            {webhookSettings.webhook_url && (
              <form method="post" action="/settings/webhooks" className="mt-3">
                {csrfToken && (
                  <input type="hidden" name="_csrf" value={csrfToken} />
                )}
                <input type="hidden" name="action" value="test" />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Test Webhook
                </button>
              </form>
            )}
          </div>

          {/* Recent Webhook Deliveries */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                Recent Webhook Deliveries
              </h2>
            </div>

            {recentDeliveries.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-gray-500 mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Webhook Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No webhooks yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Webhook deliveries will appear here after survey responses are
                  received.
                </p>
                <p className="text-sm text-gray-500">
                  Configure your webhook URL above to start receiving
                  notifications.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Survey / Subject
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Score
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Attempts
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Created / Last Attempt
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Response
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">
                              {getStatusIcon(delivery.status)}
                            </span>
                            <span className={getStatusBadge(delivery.status)}>
                              {delivery.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 break-all">
                            {delivery.survey_id}
                          </div>
                          <div className="text-sm text-gray-500 break-all">
                            {delivery.subject_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {delivery.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.attempts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatDate(delivery.created_at)}</div>
                          {delivery.last_attempt_at && (
                            <div className="text-xs text-gray-400">
                              Last: {formatDate(delivery.last_attempt_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {delivery.response_status_code ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs rounded ${
                                delivery.response_status_code >= 200 &&
                                delivery.response_status_code < 300
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {delivery.response_status_code}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Webhook Details
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • Webhooks are sent 180 seconds after a survey response to allow
                time for optional comments
              </p>
              <p>
                • Failed webhooks are retried with exponential backoff: 1min,
                5min, 30min, 2hr, 6hr, 12hr, 24hr
              </p>
              <p>
                • Webhooks include HMAC-SHA256 signature in the{" "}
                <code className="bg-blue-100 px-1 rounded">
                  X-ClickNPS-Signature
                </code>{" "}
                header for verification
              </p>
              <p>
                • Example payload: <br />
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block mt-1 whitespace-pre">
                  {JSON.stringify(
                    {
                      survey_id: "abc123",
                      subject_id: "user42",
                      score: 9,
                      comment: "Loving the product!",
                      timestamp: "2025-09-15T10:01:00Z",
                    },
                    null,
                    2,
                  )}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
