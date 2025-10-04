import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import type { JSX } from "react";
import { Alert } from "../components/alert";
import { CsrfField } from "../components/csrf-field";
import { Layout } from "../components/layouts";
import { PageHeader } from "../components/page-header";
import type { AuthContext } from "../middleware/auth";

export interface SupportState {
  success?: boolean;
  error?: string;
}

export type SupportProps = {
  auth: AuthContext;
  state?: SupportState;
  submitCsrfToken: string | null;
  csrfToken: string | null;
};

export const Support = (props: SupportProps): JSX.Element => {
  return (
    <Layout
      title="Support - ClickNPS"
      description="Get help when you need it. Submit a support request and we'll get back to you as soon as possible."
      name="support"
      auth={props.auth}
      csrfToken={props.csrfToken}
    >
      <div>
        <PageHeader
          title="Support"
          description="Need help? Submit a support request and our team will get back to you as soon as possible."
        />

        <div className="card bg-neutral text-neutral-content max-w-2xl">
          <div className="card-body">
            <form method="POST" action="/settings/support">
              <CsrfField token={props.submitCsrfToken} />

              {props.state?.success && (
                <Alert
                  type="success"
                  icon={<CheckCircle className="w-6 h-6" />}
                  title="Support request submitted successfully"
                  description="We've received your request and will get back to you soon."
                />
              )}

              {props.state?.error && (
                <Alert
                  type="error"
                  icon={<AlertTriangle className="w-6 h-6" />}
                  title={props.state.error}
                />
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Subject *</legend>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="Brief description of your issue or question"
                  required
                  minLength={2}
                  maxLength={200}
                  className="input w-full"
                />
                <p className="label">
                  A brief subject line for your request (2-200 characters).
                </p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Message *</legend>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Please describe your issue or question in detail..."
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={6}
                  className="textarea w-full"
                />
                <p className="label">
                  Detailed description of your issue or question (10-2000
                  characters).
                </p>
              </fieldset>

              <div className="pt-4">
                <button type="submit" className="btn btn-primary">
                  Submit Support Request
                </button>
              </div>

              <div className="alert alert-info alert-soft mt-6">
                <HelpCircle className="w-5 h-5" />
                <div className="flex-1">
                  <div className="font-semibold">Response Time</div>
                  <div className="text-sm">
                    We typically respond to support requests within 24-48 hours.
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
