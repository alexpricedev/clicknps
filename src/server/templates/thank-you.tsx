import { CheckCircle, MessageSquare } from "lucide-react";
import { BaseLayout } from "../components/layouts";

interface ResponseState {
  commented?: boolean;
}

interface ThankYouPageProps {
  score: number;
  alreadyResponded: boolean;
  withinCommentWindow?: boolean;
  token: string;
  state?: ResponseState;
}

export const ThankYouPage = ({
  score,
  alreadyResponded,
  withinCommentWindow,
  token,
  state,
}: ThankYouPageProps) => {
  const isPromoter = score >= 9;
  const isPassive = score >= 7 && score <= 8;

  const getScoreMessage = () => {
    if (isPromoter) {
      return "Thank you for being a promoter!";
    }
    if (isPassive) {
      return "Thank you for your feedback!";
    }
    return "Thank you for your honest feedback!";
  };

  const getScoreColor = () => {
    if (isPromoter) return "text-success";
    if (isPassive) return "text-warning";
    return "text-error";
  };

  return (
    <BaseLayout title="Thank You - ClickNPS" theme="night" name="thank-you">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="card bg-neutral text-neutral-content">
            <div className="card-body text-center">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-4">{getScoreMessage()}</h1>
                <div className="text-center">
                  <span className="text-sm opacity-80">You selected: </span>
                  <span className={`text-2xl font-bold ${getScoreColor()}`}>
                    {score}/10
                  </span>
                </div>
              </div>

              {state?.commented ? (
                <div className="space-y-4">
                  <div className="bg-success/20 border border-success/30 rounded-lg p-6 flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="bg-success/20 rounded-full p-3">
                        <CheckCircle className="w-8 h-8 text-success" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg mb-1">
                        Comment submitted successfully!
                      </h3>
                      <p className="opacity-80">
                        Thank you for taking the time to share your detailed
                        feedback with us.
                      </p>
                    </div>
                  </div>
                </div>
              ) : alreadyResponded && !withinCommentWindow ? (
                <div className="space-y-4">
                  <div className="bg-info/10 border border-info/20 rounded-lg p-6 flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="bg-info/20 rounded-full p-3">
                        <CheckCircle className="w-8 h-8 text-info" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg mb-1">
                        Response already recorded
                      </h3>
                      <p className="opacity-80">
                        We've already captured your feedback for this survey.
                        Thank you for your response!
                      </p>
                    </div>
                  </div>
                </div>
              ) : alreadyResponded && withinCommentWindow ? (
                <div className="space-y-6">
                  <div className="bg-info/10 border border-info/20 rounded-lg p-6 flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="bg-info/20 rounded-full p-3">
                        <MessageSquare className="w-8 h-8 text-info" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg mb-1">
                        Add more context to your response
                      </h3>
                      <p className="opacity-80">
                        Your score has been recorded. You still have time to add
                        additional comments if you'd like.
                      </p>
                    </div>
                  </div>

                  <form
                    action={`/r/${token}/comment`}
                    method="POST"
                    className="space-y-4"
                  >
                    <div className="form-control w-full">
                      <label className="label mb-2" htmlFor="comment">
                        <span className="label-text font-medium">
                          Share your thoughts (optional)
                        </span>
                      </label>
                      <textarea
                        id="comment"
                        name="comment"
                        rows={4}
                        className="textarea textarea-bordered w-full text-base"
                        placeholder="Tell us what worked well or what could be improved..."
                      />
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg gap-2"
                      >
                        <MessageSquare className="w-5 h-5" />
                        Submit Comment
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <form
                    action={`/r/${token}/comment`}
                    method="POST"
                    className="space-y-4"
                  >
                    <div className="form-control w-full">
                      <label
                        className="label justify-center mb-2"
                        htmlFor="comment"
                      >
                        <span className="label-text font-medium text-base">
                          Care to share more details? (optional)
                        </span>
                      </label>
                      <textarea
                        id="comment"
                        name="comment"
                        rows={4}
                        className="textarea textarea-bordered w-full text-base"
                        placeholder="Tell us what worked well or what could be improved..."
                      />
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg gap-2"
                      >
                        <MessageSquare className="w-5 h-5" />
                        Submit Comment
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-base-content/20">
                <p className="text-xs opacity-60 text-center">
                  Powered by{" "}
                  <a href="https://clicknps.com" className="link link-hover">
                    ClickNPS
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};
