import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";

type PricingProps = {
  auth?: AuthContext;
  csrfToken?: string | null;
};

export const Pricing = ({ auth, csrfToken }: PricingProps) => (
  <Layout
    title="Pricing - ClickNPS"
    description="Simple, transparent pricing for NPS surveys. Free during beta with lifetime access for early adopters. Pay only for responses you use."
    name="pricing"
    auth={auth}
    csrfToken={csrfToken}
    containerized={false}
  >
    {/* Hero Section */}
    <div className="py-16 px-4 bg-base-200 -mt-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl md:text-2xl text-base-content/80 max-w-3xl mx-auto">
          Choose pay-as-you-go or a simple monthly plan. No hidden fees, no
          surprises.
        </p>
      </div>
    </div>

    {/* Beta Announcement */}
    <div className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="shimmer-border rounded-2xl">
          <div className="card bg-gradient-to-r from-success/20 to-info/20">
            <div className="card-body items-center text-center py-12">
              <div className="badge badge-success badge-lg mb-4">
                Limited Time Offer
              </div>
              <h2 className="card-title text-3xl md:text-4xl font-bold mb-4">
                Free For Beta Members
              </h2>
              <p className="text-lg md:text-xl text-base-content/80 max-w-3xl leading-relaxed mb-6">
                Join us in beta and get <strong>lifetime access</strong> to all
                features, completely free. No credit card required. No time
                limits. Be among the first to shape the future of ClickNPS.
              </p>
              <div className="card-actions">
                <a href="/signup" className="btn btn-success btn-lg">
                  Claim Your Free Lifetime Access →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Pricing Tiers */}
    <div className="py-24 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Future Pricing Plans
        </h2>
        <p className="text-center text-base-content/70 mb-16 text-lg">
          When you're ready to upgrade from your free beta account
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Core Plan */}
          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body">
              <div className="badge badge-outline mb-2">Pay-as-you-go</div>
              <h3 className="card-title text-2xl mb-2">Core</h3>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <span className="text-4xl font-bold text-base-content/40">
                      $5
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[110%] h-[2px] bg-success rotate-[-25deg] origin-center" />
                    </div>
                  </div>
                  <span className="badge badge-success badge-lg">
                    Free for beta users
                  </span>
                </div>
                <div className="text-success font-medium">
                  for first 1,000 responses
                </div>
                <div className="text-base-content/70 text-sm mt-1">
                  Then $5 per 1,000 responses
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Unlimited surveys</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Unique survey links (0-10)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Webhook integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Credits never expire</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>No monthly commitment</span>
                </li>
              </ul>
              <div className="card-actions">
                <a href="/signup" className="btn btn-success btn-block">
                  Sign Up Free
                </a>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="card bg-base-100 border-2 border-primary">
            <div className="card-body">
              <div className="badge badge-primary mb-2">Unlock AI Insights</div>
              <h3 className="card-title text-2xl mb-2">Pro</h3>
              <div className="mb-6">
                <div className="text-4xl font-bold mb-2">$9</div>
                <div className="text-base-content/70">per month</div>
                <div className="text-sm text-primary mt-2">
                  14-day free trial
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Everything in PAYG</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    <strong>Unlimited responses</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>AI sentiment analysis (coming soon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>AI product feedback insights (coming soon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Automated monthly reports (coming soon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Check icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Priority support</span>
                </li>
              </ul>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Feature Comparison Table */}
    <div className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Feature Comparison
        </h2>

        <div className="overflow-x-auto">
          <table className="table table-lg">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="text-center">Beta (Free Forever)</th>
                <th className="text-center">PAYG</th>
                <th className="text-center">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Unlimited Surveys</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Unique Survey Links</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Webhook Integration</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Analytics Dashboard</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Optional Comments</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Unlimited Responses</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <span className="text-base-content/40">—</span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">
                  AI Sentiment Analysis
                  <span className="text-sm text-base-content/60 ml-2">
                    (coming soon)
                  </span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <span className="text-base-content/40">—</span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">
                  AI Product Feedback Insights
                  <span className="text-sm text-base-content/60 ml-2">
                    (coming soon)
                  </span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <span className="text-base-content/40">—</span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">
                  Automated Monthly Reports
                  <span className="text-sm text-base-content/60 ml-2">
                    (coming soon)
                  </span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <span className="text-base-content/40">—</span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Priority Support</td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
                <td className="text-center">
                  <span className="text-base-content/40">—</span>
                </td>
                <td className="text-center">
                  <svg
                    className="w-6 h-6 text-success mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Included</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* FAQ */}
    <div className="py-24 px-4 bg-base-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Pricing FAQ
        </h2>
        <div className="join join-vertical w-full">
          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="pricing-faq" defaultChecked />
            <div className="collapse-title text-xl font-semibold">
              How does beta pricing work?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                Beta users get lifetime access to all features, completely free.
                No credit card required, no expiration date. You'll never be
                charged.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="pricing-faq" />
            <div className="collapse-title text-xl font-semibold">
              Do credits expire?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                No! Once you purchase credits, they never expire. Use them at
                your own pace without any time pressure.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="pricing-faq" />
            <div className="collapse-title text-xl font-semibold">
              What counts as a response?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                One response = one score click (0-10). Optional comments are
                included free with each response. Only the first response per
                unique survey link is counted.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="pricing-faq" />
            <div className="collapse-title text-xl font-semibold">
              Can I switch between plans?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                Yes! On the PAYG plan, simply buy more credits as needed with no
                commitment. If you upgrade to Pro, you can cancel anytime and
                switch back to pay-as-you-go. Your unused PAYG credits never
                expire.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="pricing-faq" />
            <div className="collapse-title text-xl font-semibold">
              Do you collect any personally identifiable information (PII)?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                No. ClickNPS survey links contain only a score (0-10) and an
                optional comment. We don't require or collect any PII like
                names, emails, or other personal data. This keeps your
                compliance simple and your customers' privacy protected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* CTA */}
    <div className="hero min-h-[50vh] bg-gradient-to-br from-primary to-secondary">
      <div className="hero-content text-center text-primary-content">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to get started?
          </h2>
          <a href="/signup" className="btn btn-neutral btn-lg">
            Join Beta for Free →
          </a>
        </div>
      </div>
    </div>
  </Layout>
);
