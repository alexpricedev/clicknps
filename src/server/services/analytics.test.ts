import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { cleanupTestData, createTestBusiness } from "../test-utils/helpers";
import { getVisitorStats } from "./analytics";

describe("Analytics Service - Mock Functions", () => {
  test("getVisitorStats returns correct structure", () => {
    const stats = getVisitorStats();

    expect(stats).toHaveProperty("visitorCount");
    expect(stats).toHaveProperty("lastUpdated");
    expect(typeof stats.visitorCount).toBe("number");
    expect(typeof stats.lastUpdated).toBe("string");
  });

  test("getVisitorStats returns valid ISO timestamp", () => {
    const stats = getVisitorStats();

    const date = new Date(stats.lastUpdated);
    expect(date.toISOString()).toBe(stats.lastUpdated);
  });

  test("getVisitorStats returns non-negative visitor count", () => {
    const stats = getVisitorStats();

    expect(stats.visitorCount).toBeGreaterThanOrEqual(0);
  });

  test("getVisitorStats returns different counts over time", () => {
    const stats1 = getVisitorStats();

    setTimeout(() => {
      const stats2 = getVisitorStats();
      expect(stats1.lastUpdated).not.toBe(stats2.lastUpdated);
    }, 1);
  });
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests");
}
const connection = new SQL(process.env.DATABASE_URL);

import { mock } from "bun:test";

mock.module("./database", () => ({
  get db() {
    return connection;
  },
}));

import {
  getDashboardStats,
  getLatestResponses,
  getWeeklyNpsData,
} from "./analytics";

describe("Analytics Service - Dashboard with PostgreSQL", () => {
  let testBusinessId: string;

  beforeEach(async () => {
    await cleanupTestData(connection);
    testBusinessId = await createTestBusiness(connection);
  });

  afterEach(async () => {
    // Ensure any hanging transactions are cleaned up
    try {
      await connection`ROLLBACK`;
    } catch {
      // Ignore if no transaction is active
    }
  });

  afterAll(async () => {
    await cleanupTestData(connection);
    await connection.end();
  });

  it("should return dashboard stats with no data", async () => {
    const stats = await getDashboardStats(testBusinessId);

    expect(stats.totalResponses.value7d).toBe(0);
    expect(stats.totalResponses.value30d).toBe(0);
    expect(stats.averageNps.value7d).toBe(0);
    expect(stats.averageNps.value30d).toBe(0);
    expect(stats.responseRate.value7d).toBe(0);
    expect(stats.responseRate.value30d).toBe(0);
    expect(stats.comments.value7d).toBe(0);
    expect(stats.comments.value30d).toBe(0);
  });

  it("should calculate dashboard stats for 7d period", async () => {
    const surveyId = randomUUID();
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Test Survey')
    `;

    const link1Id = randomUUID();
    const link2Id = randomUUID();
    const token1 = `token-${randomUUID()}`;
    const token2 = `token-${randomUUID()}`;

    await connection`
      INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
      VALUES
        (${link1Id}, ${token1}, ${surveyId}, 'user1', 9, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link2Id}, ${token2}, ${surveyId}, 'user2', 7, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
    `;

    await connection`
      INSERT INTO responses (id, survey_link_id, comment, responded_at)
      VALUES
        (${randomUUID()}, ${link1Id}, 'Great service!', ${threeDaysAgo.toISOString()}),
        (${randomUUID()}, ${link2Id}, NULL, ${threeDaysAgo.toISOString()})
    `;

    const stats = await getDashboardStats(testBusinessId);

    expect(stats.totalResponses.value7d).toBe(2);
    expect(stats.averageNps.value7d).toBe(8);
    expect(stats.responseRate.value7d).toBe(100);
    expect(stats.comments.value7d).toBe(1);
  });

  it("should calculate dashboard stats for 30d period", async () => {
    const surveyId = randomUUID();
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Test Survey')
    `;

    const linkId = randomUUID();
    const token = `token-${randomUUID()}`;

    await connection`
      INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
      VALUES (${linkId}, ${token}, ${surveyId}, 'user1', 10, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
    `;

    await connection`
      INSERT INTO responses (id, survey_link_id, comment, responded_at)
      VALUES (${randomUUID()}, ${linkId}, 'Perfect!', ${twentyDaysAgo.toISOString()})
    `;

    const stats = await getDashboardStats(testBusinessId);

    expect(stats.totalResponses.value30d).toBe(1);
    expect(stats.averageNps.value30d).toBe(10);
    expect(stats.comments.value30d).toBe(1);
  });

  it("should calculate deltas correctly", async () => {
    const surveyId = randomUUID();
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Test Survey')
    `;

    const link1Id = randomUUID();
    const link2Id = randomUUID();
    const link3Id = randomUUID();
    const token1 = `token-${randomUUID()}`;
    const token2 = `token-${randomUUID()}`;
    const token3 = `token-${randomUUID()}`;

    await connection`
      INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
      VALUES
        (${link1Id}, ${token1}, ${surveyId}, 'user1', 9, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link2Id}, ${token2}, ${surveyId}, 'user2', 8, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link3Id}, ${token3}, ${surveyId}, 'user3', 7, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
    `;

    await connection`
      INSERT INTO responses (id, survey_link_id, responded_at)
      VALUES
        (${randomUUID()}, ${link1Id}, ${fiveDaysAgo.toISOString()}),
        (${randomUUID()}, ${link2Id}, ${fiveDaysAgo.toISOString()}),
        (${randomUUID()}, ${link3Id}, ${tenDaysAgo.toISOString()})
    `;

    const stats = await getDashboardStats(testBusinessId);

    expect(stats.totalResponses.value7d).toBe(2);
    expect(stats.totalResponses.delta7d).toBe(100);
  });

  it("should return empty array when no responses exist", async () => {
    const responses = await getLatestResponses(testBusinessId, 6);

    expect(responses).toHaveLength(0);
  });

  it("should return latest responses in descending order", async () => {
    const surveyId = randomUUID();
    const now = new Date();

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Customer Feedback')
    `;

    const link1Id = randomUUID();
    const link2Id = randomUUID();
    const link3Id = randomUUID();

    await connection`
      INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
      VALUES
        (${link1Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user1', 9, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link2Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user2', 5, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link3Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user3', 10, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
    `;

    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    await connection`
      INSERT INTO responses (id, survey_link_id, comment, responded_at)
      VALUES
        (${randomUUID()}, ${link1Id}, 'Great!', ${oneDayAgo.toISOString()}),
        (${randomUUID()}, ${link2Id}, 'Not good', ${twoDaysAgo.toISOString()}),
        (${randomUUID()}, ${link3Id}, 'Perfect', ${threeDaysAgo.toISOString()})
    `;

    const responses = await getLatestResponses(testBusinessId, 6);

    expect(responses).toHaveLength(3);
    expect(responses[0].surveyName).toBe("Customer Feedback");
    expect(responses[0].score).toBe(9);
    expect(responses[0].comment).toBe("Great!");
    expect(responses[1].score).toBe(5);
    expect(responses[2].score).toBe(10);
  });

  it("should respect limit parameter", async () => {
    const surveyId = randomUUID();
    const now = new Date();

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Test')
    `;

    for (let i = 0; i < 10; i++) {
      const linkId = randomUUID();
      await connection`
        INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
        VALUES (${linkId}, ${`token-${randomUUID()}`}, ${surveyId}, ${`user${i}`}, ${i}, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
      `;

      await connection`
        INSERT INTO responses (id, survey_link_id, responded_at)
        VALUES (${randomUUID()}, ${linkId}, ${new Date(now.getTime() - i * 60 * 1000).toISOString()})
      `;
    }

    const responses = await getLatestResponses(testBusinessId, 3);

    expect(responses).toHaveLength(3);
  });

  it("should return 12 weeks of NPS data", async () => {
    const weeklyData = await getWeeklyNpsData(testBusinessId, 12);

    expect(weeklyData).toHaveLength(12);
    expect(weeklyData[0].weekLabel).toContain("ago");
    expect(weeklyData[11].weekLabel).toBe("This week");
  });

  it("should calculate weekly NPS averages correctly", async () => {
    const surveyId = randomUUID();
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await connection`
      INSERT INTO surveys (id, business_id, survey_id, title)
      VALUES (${surveyId}, ${testBusinessId}, 'test-survey', 'Test Survey')
    `;

    const link1Id = randomUUID();
    const link2Id = randomUUID();
    const link3Id = randomUUID();

    await connection`
      INSERT INTO survey_links (id, token, survey_id, subject_id, score, expires_at)
      VALUES
        (${link1Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user1', 9, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link2Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user2', 7, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)}),
        (${link3Id}, ${`token-${randomUUID()}`}, ${surveyId}, 'user3', 10, ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)})
    `;

    await connection`
      INSERT INTO responses (id, survey_link_id, responded_at)
      VALUES
        (${randomUUID()}, ${link1Id}, ${threeDaysAgo.toISOString()}),
        (${randomUUID()}, ${link2Id}, ${threeDaysAgo.toISOString()}),
        (${randomUUID()}, ${link3Id}, ${tenDaysAgo.toISOString()})
    `;

    const weeklyData = await getWeeklyNpsData(testBusinessId, 12);

    const thisWeek = weeklyData[11];
    expect(thisWeek.averageNps).toBe(8);
    expect(thisWeek.responseCount).toBe(2);

    const lastWeek = weeklyData[10];
    expect(lastWeek.averageNps).toBe(10);
    expect(lastWeek.responseCount).toBe(1);
  });

  it("should handle weeks with no responses", async () => {
    const weeklyData = await getWeeklyNpsData(testBusinessId, 12);

    weeklyData.forEach((week) => {
      expect(week).toHaveProperty("weekLabel");
      expect(week).toHaveProperty("weekStart");
      expect(week).toHaveProperty("weekEnd");
      expect(week).toHaveProperty("averageNps");
      expect(week).toHaveProperty("responseCount");

      if (week.responseCount === 0) {
        expect(week.averageNps).toBeNull();
      }
    });
  });

  it("should return weeks in chronological order (oldest first)", async () => {
    const weeklyData = await getWeeklyNpsData(testBusinessId, 12);

    for (let i = 1; i < weeklyData.length; i++) {
      expect(weeklyData[i].weekStart.getTime()).toBeGreaterThan(
        weeklyData[i - 1].weekStart.getTime(),
      );
    }
  });
});
