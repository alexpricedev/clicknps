import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle,
  Mail,
} from "lucide-react";
import { Alert } from "../components/alert";
import { BaseLayout } from "../components/layouts";

export interface SignupState {
  emailSent?: boolean;
  validationError?: boolean;
  error?: string;
}

export interface SignupProps {
  state?: SignupState;
}

export const Signup = ({ state }: SignupProps) => {
  return (
    <BaseLayout
      title="Sign Up - ClickNPS"
      description="Create your ClickNPS account and start measuring customer satisfaction with NPS surveys."
      name="signup"
    >
      <main className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Create your account</h1>
            <p className="text-base-content/70">
              We'll send you a magic link to get started instantly
            </p>
          </div>

          <div className="card bg-neutral text-neutral-content shadow-xl">
            <div className="card-body">
              {state?.emailSent ? (
                <Alert
                  type="success"
                  icon={<CheckCircle className="w-6 h-6" />}
                  title="Check your email!"
                  description={
                    <>
                      <p className="mt-1">
                        We've sent you a magic link. Click it to complete your
                        account setup.
                      </p>
                      <p className="mt-2 text-xs opacity-70">
                        For testing: Check the server console for the magic
                        link.
                      </p>
                    </>
                  }
                  dismissible={false}
                />
              ) : (
                <form method="POST" action="/signup">
                  {state?.validationError && state.error && (
                    <Alert
                      type="error"
                      icon={<AlertTriangle className="w-6 h-6" />}
                      title={state.error}
                      dismissible={false}
                    />
                  )}

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      <BriefcaseBusiness className="w-4 h-4" />
                      Business name *
                    </legend>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      required
                      className="input w-full"
                      placeholder="Your Company Name"
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      <Mail className="w-4 h-4" />
                      Business email address *
                    </legend>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="input w-full"
                      placeholder="you@company.com"
                    />
                  </fieldset>

                  <div className="pt-4">
                    <button type="submit" className="btn btn-primary w-full">
                      Create account
                    </button>
                  </div>
                </form>
              )}

              <div className="divider mb-0">OR</div>

              <div className="text-center space-y-3">
                <a href="/login" className="btn btn-ghost btn-sm btn-block">
                  Already have an account? Sign in
                </a>
                <a href="/" className="btn btn-ghost btn-sm btn-block">
                  ← Back to home
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </BaseLayout>
  );
};
