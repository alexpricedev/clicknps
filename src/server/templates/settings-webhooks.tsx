import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Loader,
  TestTube,
  Webhook,
  Zap,
} from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
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
    switch (status) {
      case "delivered":
        return "badge badge-success badge-soft";
      case "failed":
        return "badge badge-error badge-soft";
      case "pending":
        return "badge badge-warning badge-soft";
      case "processing":
        return "badge badge-info badge-soft";
      default:
        return "badge badge-neutral badge-soft";
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "w-4 h-4";
    switch (status) {
      case "delivered":
        return <CheckCircle className={iconClass} />;
      case "failed":
        return <AlertTriangle className={iconClass} />;
      case "pending":
        return <Clock className={iconClass} />;
      case "processing":
        return <Loader className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  const getScoreBadgeClass = (score: number): string => {
    if (score >= 9) return "badge-success";
    if (score >= 7) return "badge-warning";
    return "badge-error";
  };

  return (
    <Layout
      title="Webhooks - Settings"
      name="webhooks"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="Webhooks"
          description="Configure webhook delivery for survey responses. Webhooks are sent after a 180-second delay to allow for optional comments."
        />

        {/* Success Messages */}
        {state?.updated && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title="Webhook Settings Updated Successfully"
              description={
                <div>
                  <div>Your webhook URL has been configured:</div>
                  <div className="bg-base-100 border border-base-300 rounded p-3 mt-2">
                    <code className="text-sm break-all select-all">
                      {state.updated.webhook_url}
                    </code>
                  </div>
                  {state.updated.webhook_secret && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-2">
                        Webhook Secret (copy this now - it won't be shown
                        again):
                      </div>
                      <div className="bg-base-100 border border-base-300 rounded p-3 mb-3">
                        <code className="text-sm break-all select-all">
                          {state.updated.webhook_secret}
                        </code>
                      </div>
                      <button type="button" className="btn btn-sm btn-success">
                        <Copy className="w-4 h-4" />
                        Copy Secret
                      </button>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        )}

        {state?.testSuccess && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title="Test Webhook Sent Successfully"
              description={`Your endpoint responded with status code ${state.testSuccess.statusCode}. Your webhook is working correctly!`}
            />
          </div>
        )}

        {state?.testError && (
          <div className="mb-6">
            <Alert
              type="error"
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Test Webhook Failed"
              description={`Status code: ${state.testError.statusCode || "No response"}. Error: ${state.testError.message}`}
            />
          </div>
        )}

        {state?.error && (
          <div className="mb-6">
            <Alert
              type="error"
              icon={<AlertTriangle className="w-6 h-6" />}
              title={`Error: ${state.error}`}
            />
          </div>
        )}

        {/* Webhook Configuration Form */}
        <div className="card bg-neutral text-neutral-content max-w-2xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              <Webhook className="w-5 h-5" />
              Configure Webhook
            </h2>
            <form
              method="POST"
              action="/settings/webhooks"
              className="space-y-6"
            >
              <CsrfField token={csrfToken} />
              <input type="hidden" name="action" value="update" />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Webhook URL *</legend>
                <input
                  type="url"
                  id="webhook_url"
                  name="webhook_url"
                  required
                  defaultValue={webhookSettings.webhook_url || ""}
                  placeholder="https://your-app.com/api/webhooks/clicknps"
                  className="input w-full"
                />
                <p className="label">
                  The endpoint where survey responses will be sent.
                </p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Webhook Secret (optional)
                </legend>
                <input
                  type="text"
                  id="webhook_secret"
                  name="webhook_secret"
                  defaultValue=""
                  placeholder="Leave empty to auto-generate"
                  className="input w-full font-mono"
                />
                <p className="label">
                  Used to verify webhook authenticity. Leave empty to
                  auto-generate a secure secret.
                  {webhookSettings.webhook_secret && (
                    <span className="block mt-1">
                      Current secret:{" "}
                      <code className="bg-base-300 px-1 rounded">
                        {formatSecretDisplay(webhookSettings.webhook_secret)}
                      </code>
                    </span>
                  )}
                </p>
              </fieldset>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="submit" className="btn btn-primary">
                  Save Webhook Settings
                </button>

                {webhookSettings.webhook_url && (
                  <button
                    type="button"
                    className="btn btn-dash"
                    data-action="test-webhook"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Webhook
                  </button>
                )}
              </div>
            </form>

            {webhookSettings.webhook_url && (
              <form
                id="test-webhook-form"
                method="POST"
                action="/settings/webhooks"
                className="hidden"
              >
                <CsrfField token={csrfToken} />
                <input type="hidden" name="action" value="test" />
              </form>
            )}
          </div>
        </div>

        {/* Recent Webhook Deliveries */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <Zap className="w-6 h-6 inline mr-2" />
            Recent Webhook Deliveries
          </h2>

          {recentDeliveries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="hero bg-base-200 rounded-box p-8 max-w-md mx-auto">
                <div className="hero-content text-center">
                  <div className="max-w-md">
                    <div className="mb-4">
                      <Webhook className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No webhooks yet</h3>
                    <p className="mb-6 opacity-80">
                      Webhook deliveries will appear here after survey responses
                      are received. Configure your webhook URL above to start
                      receiving notifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ul className="list bg-neutral rounded-box shadow-md">
              {recentDeliveries.map((delivery) => (
                <li key={delivery.id} className="list-row">
                  <div className="list-col-grow min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(delivery.status)}
                            <span className={getStatusBadge(delivery.status)}>
                              {delivery.status}
                            </span>
                          </div>
                          <div
                            className={`badge ${getScoreBadgeClass(delivery.score)}`}
                          >
                            Score: {delivery.score}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium text-base-content">
                              Survey:{" "}
                              <span className="font-mono">
                                {delivery.survey_id}
                              </span>
                            </div>
                            <div className="text-sm opacity-70">
                              Subject:{" "}
                              <span className="font-mono">
                                {delivery.subject_id}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs opacity-60">
                            <span>Attempts: {delivery.attempts}</span>
                            <span>
                              Created: {formatDate(delivery.created_at)}
                            </span>
                            {delivery.last_attempt_at && (
                              <span>
                                Last attempt:{" "}
                                {formatDate(delivery.last_attempt_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {delivery.response_status_code ? (
                          <div
                            className={`badge ${
                              delivery.response_status_code >= 200 &&
                              delivery.response_status_code < 300
                                ? "badge-success"
                                : "badge-error"
                            }`}
                          >
                            HTTP {delivery.response_status_code}
                          </div>
                        ) : (
                          <div className="badge bg-base-100">Pending</div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Help Section */}
        <div className="card bg-neutral text-neutral-content">
          <div className="card-body">
            <h3 className="card-title text-lg mb-3">
              <Zap className="w-5 h-5" />
              Webhook Details
            </h3>
            <div className="text-sm space-y-2">
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
                <code className="bg-base-100 text-base-content px-1 rounded">
                  X-ClickNPS-Signature
                </code>{" "}
                header for verification
              </p>
              <p>• Example payload:</p>
              <div className="mockup-code w-full bg-base-100">
                <pre>
                  <code>
                    {`{
    survey_id: "abc123",
    subject_id: "user42",
    score: 9,
    comment: "Loving the product!",
    timestamp: "2025-09-15T10:01:00Z",
  }`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
