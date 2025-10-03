import { Alert } from "@server/components/alert";
import { Layout } from "@server/components/layouts";
import type { AuthContext } from "@server/middleware/auth";
import type {
  DashboardStats,
  LatestResponse,
  WeeklyNpsData,
} from "@server/services/analytics";
import { CheckCircle } from "lucide-react";

export interface DashboardState {
  success?: string;
  error?: string;
}

type DashboardProps = {
  auth: AuthContext;
  csrfToken: string | null;
  stats: DashboardStats;
  latestResponses: LatestResponse[];
  weeklyNpsData: WeeklyNpsData[];
  state?: DashboardState;
};

const DeltaIndicator = ({ delta }: { delta: number }) => {
  if (delta === 0) return <span className="text-base-content/50">—</span>;
  const isPositive = delta > 0;
  return (
    <span className={isPositive ? "text-success" : "text-error"}>
      {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
};

const KpiCard = ({
  title,
  value7d,
  value30d,
  delta7d,
  delta30d,
  suffix = "",
}: {
  title: string;
  value7d: number;
  value30d: number;
  delta7d: number;
  delta30d: number;
  suffix?: string;
}) => {
  return (
    <div className="stat">
      <div className="stat-title">{title}</div>
      <div className="stat-value text-primary">
        {value7d}
        {suffix}
      </div>
      <div className="stat-desc flex gap-4 mt-2">
        <div>
          <span className="font-semibold">7d:</span>{" "}
          <DeltaIndicator delta={delta7d} />
        </div>
        <div>
          <span className="font-semibold">30d:</span> {value30d}
          {suffix} <DeltaIndicator delta={delta30d} />
        </div>
      </div>
    </div>
  );
};

const ResponseCard = ({ response }: { response: LatestResponse }) => {
  const getScoreBadgeClass = (score: number): string => {
    if (score >= 9) return "badge-success";
    if (score >= 7) return "badge-warning";
    return "badge-error";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 9) return "Promoter";
    if (score >= 7) return "Passive";
    return "Detractor";
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body p-4">
        <div className="flex justify-between items-start gap-2">
          <h3 className="card-title text-base">{response.surveyName}</h3>
          <div className="flex items-center gap-2">
            <div className="text-xs text-base-content/50">
              {formatRelativeTime(response.respondedAt)}
            </div>
            <div className={`badge ${getScoreBadgeClass(response.score)}`}>
              {response.score}
            </div>
          </div>
        </div>
        <div className="text-sm text-base-content/70">
          <span className="font-semibold">{getScoreLabel(response.score)}</span>{" "}
          · {response.subjectId}
        </div>
        {response.comment ? (
          <p className="text-sm line-clamp-2">{response.comment}</p>
        ) : (
          <p className="text-sm opacity-20">No comment</p>
        )}
      </div>
    </div>
  );
};

const NpsChart = ({ data }: { data: WeeklyNpsData[] }) => {
  const formatDateRange = (start: Date, end: Date): string => {
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const day = date.getDate();
      return `${month} ${day}`;
    };
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const chartData = {
    labels: data.map((week) => week.weekLabel),
    values: data.map((week) => week.averageNps ?? 0),
    tooltips: data.map((week) => ({
      dateRange: formatDateRange(week.weekStart, week.weekEnd),
      nps: week.averageNps?.toFixed(1) ?? "N/A",
      responseCount: week.responseCount,
    })),
  };

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="text-2xl font-bold mb-4">NPS Over Time</h2>
        {data.every((week) => week.responseCount === 0) ? (
          <div className="text-center py-12">
            <p className="text-base-content/70">No data available</p>
            <p className="text-sm text-base-content/50 mt-2">
              Start collecting responses to see NPS trends
            </p>
          </div>
        ) : (
          <div style={{ height: "300px", position: "relative", width: "100%" }}>
            <canvas
              id="nps-chart"
              data-chart-data={JSON.stringify(chartData)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const Dashboard = ({
  auth,
  csrfToken,
  stats,
  latestResponses,
  weeklyNpsData,
  state,
}: DashboardProps) => (
  <Layout title="Dashboard" name="dashboard" auth={auth} csrfToken={csrfToken}>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-base-content/70">
          Overview of your NPS surveys and customer feedback
        </p>
      </div>

      {state?.success && (
        <Alert
          type="success"
          icon={<CheckCircle className="w-6 h-6" />}
          title={state.success}
        />
      )}

      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-0">
          <div className="stats stats-vertical lg:stats-horizontal">
            <KpiCard
              title="Total Responses"
              value7d={stats.totalResponses.value7d}
              value30d={stats.totalResponses.value30d}
              delta7d={stats.totalResponses.delta7d}
              delta30d={stats.totalResponses.delta30d}
            />
            <KpiCard
              title="Average NPS"
              value7d={stats.averageNps.value7d}
              value30d={stats.averageNps.value30d}
              delta7d={stats.averageNps.delta7d}
              delta30d={stats.averageNps.delta30d}
            />
            <KpiCard
              title="Response Rate"
              value7d={stats.responseRate.value7d}
              value30d={stats.responseRate.value30d}
              delta7d={stats.responseRate.delta7d}
              delta30d={stats.responseRate.delta30d}
              suffix="%"
            />
            <KpiCard
              title="Comments"
              value7d={stats.comments.value7d}
              value30d={stats.comments.value30d}
              delta7d={stats.comments.delta7d}
              delta30d={stats.comments.delta30d}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Latest Responses</h2>
        {latestResponses.length === 0 ? (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/70">No responses yet</p>
            <p className="text-sm text-base-content/50 mt-2">
              Responses will appear here once customers start submitting
              feedback
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestResponses.map((response) => (
              <ResponseCard
                key={`${response.subjectId}-${response.respondedAt.getTime()}`}
                response={response}
              />
            ))}
          </div>
        )}
      </div>

      <NpsChart data={weeklyNpsData} />
    </div>
  </Layout>
);
