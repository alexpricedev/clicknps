import { Layout } from "@server/components/layouts";
import { WorkflowDiagram } from "@server/components/workflow-diagram";
import type { AuthContext } from "@server/middleware/auth";
import type { VisitorStats } from "@server/services/analytics";
import {
  BarChart3,
  CheckCircle,
  CirclePlay,
  ClipboardList,
  Copy,
  Eye,
  Link,
  Lock,
  MessageSquare,
  Quote,
  Shield,
  Users,
  Zap,
} from "lucide-react";

export const Home = (props: {
  method: string;
  stats: VisitorStats;
  auth: AuthContext;
  csrfToken: string | null;
}) => (
  <Layout
    title="ClickNPS - Bring the voice of the customer into every product decision"
    description="ClickNPS makes it simple for small product teams to collect, understand, and act on customer feedback. Generate secure one-time survey links, track responses, and see trends over time."
    name="home"
    auth={props.auth}
    csrfToken={props.csrfToken}
    containerized={false}
  >
    {/* Hero Section */}
    <div className="hero min-h-[80vh] bg-base-200 -mt-8">
      <div className="hero-content flex-col lg:flex-row-reverse max-w-7xl gap-12">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 order-2 lg:order-1">
          <div className="bg-base-300 rounded-lg p-8 w-full max-w-2xl aspect-video flex items-center justify-center border border-base-content/10">
            <div className="text-center text-base-content/50">
              <CirclePlay className="h-24 w-24 mx-auto mb-4" />
              <p className="text-sm">Video Placeholder...</p>
            </div>
          </div>

          {/* Beta Free Access Badge */}
          <div className="shimmer-border rounded-full">
            <div className="flex items-center rounded-full gap-2 py-2 px-4 bg-gradient-to-r from-success/20 to-info/20">
              <Zap className="h-4 w-4 text-success animate-pulse flex-shrink-0 fill-current" />
              <span className="text-sm md:text-base font-semibold">
                Free during beta — lifetime access, no credit card
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 text-center lg:text-left order-1 lg:order-2">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Bring the voice of the customer into every product decision.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-base-content/80 leading-relaxed">
            ClickNPS makes it simple for small product teams to collect,
            understand, and act on customer feedback — so you can move forward
            with confidence, not guesswork.
          </p>

          <div className="flex gap-4 justify-center lg:justify-start flex-wrap">
            <a href="/signup" className="btn btn-primary btn-lg">
              Start Collecting Feedback →
            </a>
          </div>
        </div>
      </div>
    </div>

    {/* Supporting Concept Section */}
    <div className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="card py-12 bg-gradient-to-br from-primary/10 to-secondary/10 border border-base-content/10">
          <div className="card-body items-center text-center gap-6">
            <h2 className="card-title text-4xl md:text-5xl font-bold mb-4">
              Build NPS into the fabric of your product.
            </h2>
            <p className="text-lg md:text-xl text-base-content/80 max-w-3xl leading-relaxed">
              ClickNPS is an API-first service built specifically to fit any
              stack. Generate user-unique survey links programmatically, embed
              them anywhere in your product or send them via email, and view the
              results in our dashboard or collect responses in your own platform
              via webhooks. No UI lock-in, no forced workflows.
            </p>
            <div className="bg-base-300 rounded-lg p-8 md:p-12 mt-6 w-full max-w-4xl border border-base-content/10">
              <WorkflowDiagram />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Core Benefits - 4 Cards */}
    <div className="py-24 px-4 bg-base-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Why Teams Choose ClickNPS
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h3 className="card-title text-xl mb-2">Clarity</h3>
              <p className="text-base-content/70">
                Cut through the noise with a single, actionable metric. NPS
                gives you a clear pulse on customer sentiment without drowning
                in complex analytics.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="card-title text-xl mb-2">Simplicity</h3>
              <p className="text-base-content/70">
                No complex survey logic or branching questions. Just one
                question and an optional comment. Get meaningful feedback
                without overwhelming your customers.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="card-title text-xl mb-2">Confidence</h3>
              <p className="text-base-content/70">
                Stop guessing what your customers want. Track trends over time,
                measure the impact of changes, and make product decisions backed
                by real feedback.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="card-title text-xl mb-2">Trust</h3>
              <p className="text-base-content/70">
                No spam. Every link is uniquely signed, valid for one user, and
                time-limited for clean, reliable data. No PII required—links
                contain only a score, keeping your data privacy-first.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Feature Details */}
    <div className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Everything You Need
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <Link className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="card-title text-2xl mb-3">Unique Survey Links</h3>
              <p className="text-base-content/70 text-lg">
                Generate pre-scored links for each NPS rating (0-10). Share via
                email or embed directly in your app.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <Copy className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="card-title text-2xl mb-3">Webhook Integration</h3>
              <p className="text-base-content/70 text-lg">
                Get notified the moment a response arrives. Trigger actions in
                your existing tools.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <BarChart3 className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="card-title text-2xl mb-3">Analytics Dashboard</h3>
              <p className="text-base-content/70 text-lg">
                Track your Net Promoter Score, spot shifts in sentiment, and
                read user comments to understand the "why" behind the numbers.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body">
              <div className="mb-4">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="card-title text-2xl mb-3">Secure by Design</h3>
              <p className="text-base-content/70 text-lg">
                Cryptographically signed, single-use links mean no spam, no
                duplicates, and data you can trust.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Use Cases */}
    <div className="py-24 px-4 bg-base-200">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Built for Teams Like Yours
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body text-center">
              <div className="mb-4">
                <Zap className="h-12 w-12 mx-auto text-accent" />
              </div>
              <h3 className="card-title text-xl justify-center mb-2">
                Startup Founders
              </h3>
              <p className="text-base-content/70">
                Show traction fast with clear customer sentiment data.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body text-center">
              <div className="mb-4">
                <ClipboardList className="h-12 w-12 mx-auto text-accent" />
              </div>
              <h3 className="card-title text-xl justify-center mb-2">
                Product Leaders
              </h3>
              <p className="text-base-content/70">
                Align roadmaps with real feedback, not assumptions.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-content/10">
            <div className="card-body text-center">
              <div className="mb-4">
                <Users className="h-12 w-12 mx-auto text-accent" />
              </div>
              <h3 className="card-title text-xl justify-center mb-2">
                Modern Agencies
              </h3>
              <p className="text-base-content/70">
                Deliver clear NPS reports that clients actually understand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Social Proof / Quote */}
    <div className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
          <div className="card-body items-center text-center py-16 px-8 md:px-16">
            <Quote className="h-8 w-8 text-primary mb-6" />
            <blockquote className="text-2xl md:text-3xl font-medium mb-8 px-4 md:px-8">
              "The API-first approach means we can trigger NPS surveys right
              after key product moments. Our response rate jumped from 12% to
              43%, and we actually understand what users want now."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src="https://ui-avatars.com/api/?name=Sarah+Chen&background=6366f1&color=fff&size=128"
                    alt="Sarah Chen"
                  />
                </div>
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">Sarah Chen</p>
                <p className="text-base-content/70">
                  Head of Product, TaskFlow
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* FAQ Section */}
    <div className="py-24 px-4 bg-base-200">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Frequently Asked Questions
        </h2>
        <div className="join join-vertical w-full">
          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" defaultChecked />
            <div className="collapse-title text-xl font-semibold">
              How does ClickNPS work?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                You create a survey, and ClickNPS generates unique, pre-scored
                links for each NPS rating (0-10). Send these links to your
                customers via email, in-app messages, or any channel you prefer.
                When they click, they can leave an optional comment. All
                responses are tracked in your dashboard, and you can receive
                real-time notifications via webhooks.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" />
            <div className="collapse-title text-xl font-semibold">
              What makes ClickNPS different from other survey tools?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                ClickNPS is API-first and purpose-built for NPS. Unlike generic
                survey platforms, we focus on one thing: making it dead simple
                to collect and act on customer sentiment. No complex form
                builders, no feature bloat. Just clean REST endpoints,
                cryptographically signed links, and a straightforward dashboard.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" />
            <div className="collapse-title text-xl font-semibold">
              How much does ClickNPS cost?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                ClickNPS is completely free during beta, and early adopters get
                lifetime access to all features. After beta, we'll introduce
                simple pay-as-you-go pricing starting at $5 per 1,000 responses.
                No subscriptions, no hidden fees, and credits never expire.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" />
            <div className="collapse-title text-xl font-semibold">
              Can I integrate ClickNPS with my existing tools?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                Yes. ClickNPS provides webhooks that fire when a response is
                received, allowing you to pipe feedback into Slack, your CRM,
                analytics tools, or anywhere else. Since everything is
                API-driven, you can also pull data programmatically and build
                custom integrations.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" />
            <div className="collapse-title text-xl font-semibold">
              Do I need to be technical to use ClickNPS?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                Not at all. While ClickNPS is API-first and developer-friendly,
                you can create surveys, generate links, and view responses
                entirely through our web dashboard. The API is there when you
                need it, but it's completely optional for getting started.
              </p>
            </div>
          </div>

          <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
            <input type="radio" name="faq-accordion" />
            <div className="collapse-title text-xl font-semibold">
              How do the secure survey links work?
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">
                Each survey link is cryptographically signed and tied to a
                specific customer identifier you provide. Links are single-use
                and time-limited, preventing spam and duplicate responses. This
                ensures your data is clean, reliable, and trustworthy without
                annoying your customers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Final CTA */}
    <div className="hero min-h-[60vh] bg-gradient-to-br from-primary to-secondary">
      <div className="hero-content text-center text-primary-content">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to hear your customers?
          </h2>
          <a href="/signup" className="btn btn-neutral btn-lg">
            Start Collecting Feedback →
          </a>
        </div>
      </div>
    </div>
  </Layout>
);
