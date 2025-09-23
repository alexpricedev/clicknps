import type { JSX } from "react";
import { Layout } from "../components/layouts";
import type { ApiKeysState } from "../controllers/app/settings";
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
    <Layout title="API Keys - Settings" name="settings">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">API Keys</h1>
            <p className="text-gray-600">
              Manage API keys for your business. Use these keys to authenticate
              with our API.
            </p>
          </div>

          {/* Success Messages */}
          {state?.created && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">
                ✅ API Key Created Successfully
              </h3>
              <p className="mb-3">
                Your new API key <strong>"{state.created.name}"</strong> has
                been created. Copy this key now - it won't be shown again.
              </p>
              <div className="bg-white border border-green-300 rounded p-3 mb-3">
                <code className="text-sm break-all select-all">
                  {state.created.token}
                </code>
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Copy Key
              </button>
            </div>
          )}

          {state?.rotated && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">
                🔄 API Key Rotated Successfully
              </h3>
              <p className="mb-3">
                Your API key <strong>"{state.rotated.name}"</strong> has been
                rotated. Copy this new key now - it won't be shown again.
              </p>
              <div className="bg-white border border-blue-300 rounded p-3 mb-3">
                <code className="text-sm break-all select-all">
                  {state.rotated.token}
                </code>
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Copy Key
              </button>
            </div>
          )}

          {state?.revoked && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">
                🗑️ API Key "{state.revoked.name}" has been revoked successfully.
              </p>
            </div>
          )}

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">❌ Error: {state.error}</p>
            </div>
          )}

          {/* Create New Key Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Create New API Key</h2>
            <form
              method="post"
              action="/settings/api-keys"
              className="space-y-4"
            >
              {csrfToken && (
                <input type="hidden" name="_csrf" value={csrfToken} />
              )}
              <input type="hidden" name="action" value="create" />

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Key Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., Production API, Development"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name to help you identify this key.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create API Key
                </button>
              </div>
            </form>
          </div>

          {/* API Keys List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Your API Keys</h2>
            </div>

            {apiKeys.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-gray-500 mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>API Key Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No API keys yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first API key to start integrating with our API.
                </p>
                <p className="text-sm text-gray-500">
                  API keys allow your applications to authenticate and make
                  requests to our services.
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
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Key
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Last Used
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {key.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {formatKeyDisplay(key)}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(key.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.last_used_at
                            ? formatDate(key.last_used_at)
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <form
                            method="post"
                            action="/settings/api-keys"
                            className="inline"
                          >
                            {csrfToken && (
                              <input
                                type="hidden"
                                name="_csrf"
                                value={csrfToken}
                              />
                            )}
                            <input type="hidden" name="action" value="rotate" />
                            <input type="hidden" name="id" value={key.id} />
                            <button
                              type="submit"
                              className="text-blue-600 hover:text-blue-900 focus:outline-none focus:underline"
                            >
                              Rotate
                            </button>
                          </form>

                          <form
                            method="post"
                            action="/settings/api-keys"
                            className="inline"
                          >
                            {csrfToken && (
                              <input
                                type="hidden"
                                name="_csrf"
                                value={csrfToken}
                              />
                            )}
                            <input type="hidden" name="action" value="revoke" />
                            <input type="hidden" name="id" value={key.id} />
                            <button
                              type="submit"
                              className="text-red-600 hover:text-red-900 focus:outline-none focus:underline"
                            >
                              Revoke
                            </button>
                          </form>
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
              Using Your API Keys
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • Include your API key in the{" "}
                <code className="bg-blue-100 px-1 rounded">Authorization</code>{" "}
                header:
                <code className="bg-blue-100 px-1 rounded ml-1">
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
