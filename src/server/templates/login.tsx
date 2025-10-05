import { AlertTriangle, CheckCircle, Mail } from "lucide-react";
import { Alert } from "../components/alert";
import { BaseLayout } from "../components/layouts";

export interface LoginState {
  emailSent?: boolean;
  validationError?: boolean;
  error?: string;
}

export interface LoginProps {
  state?: LoginState;
}

export const Login = ({ state }: LoginProps) => {
  return (
    <BaseLayout
      title="Login - ClickNPS"
      description="Sign in to your ClickNPS account to access your NPS surveys and customer feedback."
      name="login"
    >
      <main className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Sign in to your account</h1>
            <p className="text-base-content/70">
              We'll send you a magic link to sign in instantly
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
                    <p className="mt-1">
                      We've sent you a magic link. Click it to sign in
                      instantly.
                    </p>
                  }
                  dismissible={false}
                />
              ) : (
                <form method="POST" action="/login">
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
                      <Mail className="w-4 h-4" />
                      Email address *
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
                      Send magic link
                    </button>
                  </div>
                </form>
              )}

              <div className="divider mb-0">OR</div>

              <div className="text-center space-y-3">
                <a href="/signup" className="btn btn-ghost btn-sm btn-block">
                  Don't have an account? Sign up
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
