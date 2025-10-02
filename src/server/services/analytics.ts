import { db } from "./database";

export type VisitorStats = {
  visitorCount: number;
  lastUpdated: string;
};

export const getVisitorStats = (): VisitorStats => {
  // Mock visitor count that changes over time
  const mockVisitorCount = Math.floor(Date.now() / 1000) % 10000;

  return {
    visitorCount: mockVisitorCount,
    lastUpdated: new Date().toISOString(),
  };
};

export interface KpiMetric {
  value7d: number;
  value30d: number;
  delta7d: number;
  delta30d: number;
}

export interface DashboardStats {
  totalResponses: KpiMetric;
  averageNps: KpiMetric;
  responseRate: KpiMetric;
  comments: KpiMetric;
}

export interface LatestResponse {
  surveyName: string;
  subjectId: string;
  score: number;
  comment: string | null;
  respondedAt: Date;
}

export interface WeeklyNpsData {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  averageNps: number | null;
  responseCount: number;
}

export const getDashboardStats = async (
  businessId: string,
): Promise<DashboardStats> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const stats7d = await db`
    SELECT
      COUNT(r.id) as response_count,
      COUNT(CASE WHEN r.comment IS NOT NULL AND r.comment != '' THEN 1 END) as comment_count,
      AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END) as average_nps,
      COUNT(DISTINCT sl.subject_id) as unique_subjects,
      COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN sl.subject_id END) as respondents
    FROM surveys s
    LEFT JOIN survey_links sl ON s.id = sl.survey_id
    LEFT JOIN responses r ON sl.id = r.survey_link_id AND r.responded_at >= ${sevenDaysAgo.toISOString()}
    WHERE s.business_id = ${businessId}
  `;

  const statsPrev7d = await db`
    SELECT
      COUNT(r.id) as response_count,
      COUNT(CASE WHEN r.comment IS NOT NULL AND r.comment != '' THEN 1 END) as comment_count,
      AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END) as average_nps,
      COUNT(DISTINCT sl.subject_id) as unique_subjects,
      COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN sl.subject_id END) as respondents
    FROM surveys s
    LEFT JOIN survey_links sl ON s.id = sl.survey_id
    LEFT JOIN responses r ON sl.id = r.survey_link_id
      AND r.responded_at >= ${fourteenDaysAgo.toISOString()}
      AND r.responded_at < ${sevenDaysAgo.toISOString()}
    WHERE s.business_id = ${businessId}
  `;

  const stats30d = await db`
    SELECT
      COUNT(r.id) as response_count,
      COUNT(CASE WHEN r.comment IS NOT NULL AND r.comment != '' THEN 1 END) as comment_count,
      AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END) as average_nps,
      COUNT(DISTINCT sl.subject_id) as unique_subjects,
      COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN sl.subject_id END) as respondents
    FROM surveys s
    LEFT JOIN survey_links sl ON s.id = sl.survey_id
    LEFT JOIN responses r ON sl.id = r.survey_link_id AND r.responded_at >= ${thirtyDaysAgo.toISOString()}
    WHERE s.business_id = ${businessId}
  `;

  const statsPrev30d = await db`
    SELECT
      COUNT(r.id) as response_count,
      COUNT(CASE WHEN r.comment IS NOT NULL AND r.comment != '' THEN 1 END) as comment_count,
      AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END) as average_nps,
      COUNT(DISTINCT sl.subject_id) as unique_subjects,
      COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN sl.subject_id END) as respondents
    FROM surveys s
    LEFT JOIN survey_links sl ON s.id = sl.survey_id
    LEFT JOIN responses r ON sl.id = r.survey_link_id
      AND r.responded_at >= ${sixtyDaysAgo.toISOString()}
      AND r.responded_at < ${thirtyDaysAgo.toISOString()}
    WHERE s.business_id = ${businessId}
  `;

  const current7d = stats7d[0] as {
    response_count: string;
    comment_count: string;
    average_nps: string | null;
    unique_subjects: string;
    respondents: string;
  };

  const previous7d = statsPrev7d[0] as {
    response_count: string;
    comment_count: string;
    average_nps: string | null;
    unique_subjects: string;
    respondents: string;
  };

  const current30d = stats30d[0] as {
    response_count: string;
    comment_count: string;
    average_nps: string | null;
    unique_subjects: string;
    respondents: string;
  };

  const previous30d = statsPrev30d[0] as {
    response_count: string;
    comment_count: string;
    average_nps: string | null;
    unique_subjects: string;
    respondents: string;
  };

  const calculateDelta = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateResponseRate = (
    respondents: number,
    subjects: number,
  ): number => {
    if (subjects === 0) return 0;
    return Math.round((respondents / subjects) * 100);
  };

  const responseCount7d = Number(current7d.response_count) || 0;
  const responseCountPrev7d = Number(previous7d.response_count) || 0;
  const responseCount30d = Number(current30d.response_count) || 0;
  const responseCountPrev30d = Number(previous30d.response_count) || 0;

  const avgNps7d = current7d.average_nps ? Number(current7d.average_nps) : 0;
  const avgNpsPrev7d = previous7d.average_nps
    ? Number(previous7d.average_nps)
    : 0;
  const avgNps30d = current30d.average_nps ? Number(current30d.average_nps) : 0;
  const avgNpsPrev30d = previous30d.average_nps
    ? Number(previous30d.average_nps)
    : 0;

  const responseRate7d = calculateResponseRate(
    Number(current7d.respondents),
    Number(current7d.unique_subjects),
  );
  const responseRatePrev7d = calculateResponseRate(
    Number(previous7d.respondents),
    Number(previous7d.unique_subjects),
  );
  const responseRate30d = calculateResponseRate(
    Number(current30d.respondents),
    Number(current30d.unique_subjects),
  );
  const responseRatePrev30d = calculateResponseRate(
    Number(previous30d.respondents),
    Number(previous30d.unique_subjects),
  );

  const commentCount7d = Number(current7d.comment_count) || 0;
  const commentCountPrev7d = Number(previous7d.comment_count) || 0;
  const commentCount30d = Number(current30d.comment_count) || 0;
  const commentCountPrev30d = Number(previous30d.comment_count) || 0;

  return {
    totalResponses: {
      value7d: responseCount7d,
      value30d: responseCount30d,
      delta7d: calculateDelta(responseCount7d, responseCountPrev7d),
      delta30d: calculateDelta(responseCount30d, responseCountPrev30d),
    },
    averageNps: {
      value7d: Math.round(avgNps7d * 10) / 10,
      value30d: Math.round(avgNps30d * 10) / 10,
      delta7d: calculateDelta(
        Math.round(avgNps7d * 10),
        Math.round(avgNpsPrev7d * 10),
      ),
      delta30d: calculateDelta(
        Math.round(avgNps30d * 10),
        Math.round(avgNpsPrev30d * 10),
      ),
    },
    responseRate: {
      value7d: responseRate7d,
      value30d: responseRate30d,
      delta7d: calculateDelta(responseRate7d, responseRatePrev7d),
      delta30d: calculateDelta(responseRate30d, responseRatePrev30d),
    },
    comments: {
      value7d: commentCount7d,
      value30d: commentCount30d,
      delta7d: calculateDelta(commentCount7d, commentCountPrev7d),
      delta30d: calculateDelta(commentCount30d, commentCountPrev30d),
    },
  };
};

export const getLatestResponses = async (
  businessId: string,
  limit = 6,
): Promise<LatestResponse[]> => {
  const result = await db`
    SELECT
      s.title as survey_name,
      sl.subject_id,
      sl.score,
      r.comment,
      r.responded_at
    FROM responses r
    JOIN survey_links sl ON r.survey_link_id = sl.id
    JOIN surveys s ON sl.survey_id = s.id
    WHERE s.business_id = ${businessId}
    ORDER BY r.responded_at DESC
    LIMIT ${limit}
  `;

  return result.map(
    (row: {
      survey_name: string;
      subject_id: string;
      score: number;
      comment: string | null;
      responded_at: string;
    }) => ({
      surveyName: row.survey_name,
      subjectId: row.subject_id,
      score: row.score,
      comment: row.comment,
      respondedAt: new Date(row.responded_at),
    }),
  );
};

export const getWeeklyNpsData = async (
  businessId: string,
  weeks = 12,
): Promise<WeeklyNpsData[]> => {
  const now = new Date();
  const weeklyData: WeeklyNpsData[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const result = await db`
      SELECT
        COUNT(r.id) as response_count,
        AVG(CASE WHEN r.id IS NOT NULL THEN sl.score END) as average_nps
      FROM surveys s
      LEFT JOIN survey_links sl ON s.id = sl.survey_id
      LEFT JOIN responses r ON sl.id = r.survey_link_id
        AND r.responded_at >= ${weekStart.toISOString()}
        AND r.responded_at <= ${weekEnd.toISOString()}
      WHERE s.business_id = ${businessId}
    `;

    const row = result[0] as {
      response_count: string;
      average_nps: string | null;
    };

    const responseCount = Number(row.response_count) || 0;
    const averageNps = row.average_nps ? Number(row.average_nps) : null;

    const weekLabel =
      i === 0 ? "This week" : i === 1 ? "Last week" : `${i}w ago`;

    weeklyData.push({
      weekLabel,
      weekStart,
      weekEnd,
      averageNps: averageNps ? Math.round(averageNps * 10) / 10 : null,
      responseCount,
    });
  }

  return weeklyData;
};
