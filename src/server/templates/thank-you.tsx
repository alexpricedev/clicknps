import { BaseLayout } from "../components/layouts";

interface ResponseState {
  commented?: boolean;
}

interface ThankYouPageProps {
  score: number;
  alreadyResponded: boolean;
  token: string;
  state?: ResponseState;
}

export const ThankYouPage = ({
  score,
  alreadyResponded,
  token,
  state,
}: ThankYouPageProps) => {
  const isPromoter = score >= 9;
  const isPassive = score >= 7 && score <= 8;

  const getScoreMessage = () => {
    if (isPromoter) {
      return "Thank you for being a promoter! 🎉";
    }
    if (isPassive) {
      return "Thank you for your feedback! 👍";
    }
    return "Thank you for your honest feedback! 🙏";
  };

  const getScoreColor = () => {
    if (isPromoter) return "text-green-600";
    if (isPassive) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <BaseLayout title="Thank You - ClickNPS">
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {getScoreMessage()}
              </h1>
              <div className="text-center">
                <span className="text-sm text-gray-500">You selected: </span>
                <span className={`text-2xl font-bold ${getScoreColor()}`}>
                  {score}/10
                </span>
              </div>
            </div>

            {state?.commented ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
                <p className="font-semibold">
                  💬 Comment submitted successfully!
                </p>
                <p className="text-sm mt-1">Thank you for your feedback.</p>
              </div>
            ) : alreadyResponded ? (
              <div className="text-gray-600">
                <p>We've already recorded your response for this survey.</p>
                <p className="text-sm mt-2">Thank you for your feedback!</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6">
                  Your response has been recorded. Care to share more details?
                </p>

                <form
                  action={`/r/${token}/comment`}
                  method="POST"
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="comment" className="sr-only">
                      Optional comment
                    </label>
                    <textarea
                      id="comment"
                      name="comment"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us more about your experience (optional)..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Submit Comment
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      No Thanks
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                Powered by{" "}
                <a
                  href="https://clicknps.com"
                  className="text-blue-500 hover:text-blue-600"
                >
                  ClickNPS
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};
