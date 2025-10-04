import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Key,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { ApiKeysState } from "../controllers/app/api-keys";
import type { AuthContext } from "../middleware/auth";

export interface ApiKey {
  id: string;
  business_id: string;
  name: string;
  last_used_at: Date | null;
  created_at: Date;
}

export interface ApiKeysSettingsProps {
  auth: AuthContext;
  apiKeys: ApiKey[];
  state?: ApiKeysState;
  csrfToken: string | null;
}

export const ApiKeysSettings = (props: ApiKeysSettingsProps): JSX.Element => {
  const { apiKeys, state, csrfToken } = props;

  const formatKeyDisplay = (_key: ApiKey) => {
    return `ck_${"•".repeat(44)}`;
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

  return (
    <Layout
      title="API Keys - ClickNPS"
      description="Manage API keys for authenticating with the ClickNPS API to programmatically access your surveys and responses."
      name="api-keys"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="API Keys"
          description="Manage API keys for your business. Use these keys to authenticate with our API."
        />

        {/* Success Messages */}
        {state?.created && (
          <div className="mb-6">
            <Alert
              type="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title="API Key Created Successfully"
              description={
                <div>
                  <div>
                    Your new API key <strong>"{state.created.name}"</strong> has
                    been created. Copy this key now - it won't be shown again.
                  </div>
                  <div className="bg-base-100 border border-base-300 rounded p-3 mt-3 mb-3">
                    <code className="text-sm break-all select-all">
                      {state.created.token}
                    </code>
                  </div>
                  <button type="button" className="btn btn-sm btn-success">
                    <Copy className="w-4 h-4" />
                    Copy Key
                  </button>
                </div>
              }
            />
          </div>
        )}

        {state?.rotated && (
          <div className="mb-6">
            <Alert
              type="info"
              icon={<RefreshCw className="w-6 h-6" />}
              title="API Key Rotated Successfully"
              description={
                <div>
                  <div>
                    Your API key <strong>"{state.rotated.name}"</strong> has
                    been rotated. Copy this new key now - it won't be shown
                    again.
                  </div>
                  <div className="bg-base-100 border border-base-300 rounded p-3 mt-3 mb-3">
                    <code className="text-sm break-all select-all">
                      {state.rotated.token}
                    </code>
                  </div>
                  <button type="button" className="btn btn-sm btn-info">
                    <Copy className="w-4 h-4" />
                    Copy Key
                  </button>
                </div>
              }
            />
          </div>
        )}

        {state?.revoked && (
          <div className="mb-6">
            <Alert
              type="warning"
              icon={<Trash2 className="w-6 h-6" />}
              title={`API Key "${state.revoked.name}" has been revoked successfully.`}
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

        {/* Create New Key Form */}
        <div className="card bg-neutral text-neutral-content max-w-2xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">
              <Key className="w-5 h-5" />
              Create New API Key
            </h2>
            <form
              method="POST"
              action="/settings/api-keys"
              className="space-y-6"
            >
              <CsrfField token={csrfToken} />
              <input type="hidden" name="action" value="create" />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Key Name *</legend>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="e.g., Production API, Development"
                  className="input w-full"
                />
                <p className="label">
                  Choose a descriptive name to help you identify this key (2-100
                  characters).
                </p>
              </fieldset>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="submit" className="btn btn-primary">
                  <Key className="w-4 h-4" />
                  Create API Key
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* API Keys List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <Shield className="w-6 h-6 inline mr-2" />
            Your API Keys
          </h2>

          {apiKeys.length === 0 ? (
            <div className="hero bg-base-200 rounded-box p-8">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <div className="mb-4">
                    <Key className="w-16 h-16 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No API keys yet</h3>
                  <p className="mb-6 opacity-80">
                    Create your first API key to start integrating with our API.
                    API keys allow your applications to authenticate and make
                    requests to our services.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ul className="list bg-neutral rounded-box shadow-md">
              {apiKeys.map((key) => (
                <li key={key.id} className="list-row">
                  <div className="list-col-grow min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-base-content mb-2">
                          {key.name}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm opacity-60">Key:</span>
                            <code className="text-sm bg-base-300 px-2 py-1 rounded font-mono">
                              {formatKeyDisplay(key)}
                            </code>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs opacity-60">
                            <span>Created: {formatDate(key.created_at)}</span>
                            <span>
                              Last used:{" "}
                              {key.last_used_at
                                ? formatDate(key.last_used_at)
                                : "Never"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="join join-vertical lg:join-horizontal">
                        <form
                          method="POST"
                          action="/settings/api-keys"
                          className="inline"
                        >
                          <CsrfField token={csrfToken} />
                          <input type="hidden" name="action" value="rotate" />
                          <input type="hidden" name="id" value={key.id} />
                          <button
                            type="submit"
                            className="btn btn-sm join-item"
                            title="Generate a new key for this API key"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Rotate
                          </button>
                        </form>

                        <form
                          method="POST"
                          action="/settings/api-keys"
                          className="inline"
                        >
                          <CsrfField token={csrfToken} />
                          <input type="hidden" name="action" value="revoke" />
                          <input type="hidden" name="id" value={key.id} />
                          <button
                            type="submit"
                            className="btn btn-sm btn-error join-item"
                            title="Permanently delete this API key"
                          >
                            <Trash2 className="w-4 h-4" />
                            Revoke
                          </button>
                        </form>
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
              <Shield className="w-5 h-5" />
              Using Your API Keys
            </h3>
            <div className="text-sm space-y-2">
              <p>
                • Include your API key in the{" "}
                <code className="bg-base-100 text-base-content px-1 rounded">
                  Authorization
                </code>{" "}
                header:
                <code className="bg-base-100 text-base-content px-1 rounded ml-1">
                  Bearer YOUR_API_KEY
                </code>
              </p>
              <p>
                • Keep your API keys secure and never expose them in client-side
                code
              </p>
              <p>• Rotate keys regularly for better security</p>
              <p>• Revoke keys immediately if they may have been compromised</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
