#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import { createSurvey, mintSurveyLinks } from "../services/surveys";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = new SQL(DATABASE_URL);

interface User {
  id: string;
  email: string;
  business_id: string;
}

interface Business {
  id: string;
  business_name: string;
}

const findOrCreateUser = async (email: string): Promise<User> => {
  const existingUsers = await db`
    SELECT id, email, business_id
    FROM users
    WHERE email = ${email}
  `;

  if (existingUsers.length > 0) {
    return existingUsers[0] as User;
  }

  const business = await createBusiness(`${email}'s Business`);
  const userId = randomUUID();

  await db`
    INSERT INTO users (id, email, business_id)
    VALUES (${userId}, ${email}, ${business.id})
  `;

  return { id: userId, email, business_id: business.id };
};

const createBusiness = async (businessName: string): Promise<Business> => {
  const businessId = randomUUID();

  await db`
    INSERT INTO businesses (id, business_name, created_at, updated_at)
    VALUES (${businessId}, ${businessName}, NOW(), NOW())
  `;

  return { id: businessId, business_name: businessName };
};

const getRandomScore = (): number => {
  const rand = Math.random();

  if (rand < 0.4) {
    return Math.random() < 0.5 ? 9 : 10;
  }

  if (rand < 0.7) {
    return Math.random() < 0.5 ? 7 : 8;
  }

  return Math.floor(Math.random() * 7);
};

const getRandomComment = (score: number): string | null => {
  if (Math.random() > 0.3) {
    return null;
  }

  const promoterComments = [
    "Excellent service! Very satisfied.",
    "Love the product, keep up the great work!",
    "Outstanding experience from start to finish.",
    "Highly recommend to everyone!",
    "Best service I've used in years.",
    "Exceeded my expectations completely.",
  ];

  const passiveComments = [
    "Good overall, but could be better.",
    "It's okay, does what it needs to do.",
    "Decent experience, nothing special.",
    "Works fine but room for improvement.",
    "Satisfied but not amazed.",
  ];

  const detractorComments = [
    "Very disappointed with the experience.",
    "Not what I expected, needs major improvements.",
    "Had several issues that weren't resolved.",
    "Would not recommend based on my experience.",
    "Customer service was lacking.",
    "Product didn't meet basic expectations.",
    "Frustrating experience overall.",
  ];

  if (score >= 9) {
    return promoterComments[
      Math.floor(Math.random() * promoterComments.length)
    ];
  }
  if (score >= 7) {
    return passiveComments[Math.floor(Math.random() * passiveComments.length)];
  }
  return detractorComments[
    Math.floor(Math.random() * detractorComments.length)
  ];
};

const seedSurveys = async (businessId: string) => {
  console.log("Creating surveys...");

  const surveys = [
    await createSurvey(businessId, "product-satisfaction", {
      title: "Product Satisfaction Survey",
      description: "How satisfied are you with our product?",
      ttl_days: 30,
    }),
    await createSurvey(businessId, "customer-support", {
      title: "Customer Support Experience",
      description: "How was your support experience?",
      ttl_days: 60,
    }),
    await createSurvey(businessId, "overall-experience", {
      title: "Overall Experience",
      description: "How likely are you to recommend us?",
      ttl_days: 90,
    }),
  ];

  console.log(`✓ Created ${surveys.length} surveys`);
  return surveys;
};

const seedResponses = async (businessId: string) => {
  console.log("Generating response data...");

  const surveys = await db`
    SELECT id, survey_id, title
    FROM surveys
    WHERE business_id = ${businessId}
  `;

  if (surveys.length === 0) {
    throw new Error("No surveys found for this business");
  }

  const now = new Date();
  const totalSubjects = 80;
  let totalResponses = 0;

  for (const survey of surveys) {
    console.log(`  Generating responses for "${survey.title}"...`);
    const surveySubjects = Math.floor(
      totalSubjects * (0.8 + Math.random() * 0.4),
    );

    for (let subjectNum = 1; subjectNum <= surveySubjects; subjectNum++) {
      const subjectId = `user-${String(subjectNum).padStart(3, "0")}`;

      const score = getRandomScore();

      await mintSurveyLinks(
        {
          id: survey.id,
          business_id: businessId,
          survey_id: survey.survey_id,
          title: survey.title,
          description: survey.description,
          ttl_days: survey.ttl_days || 30,
          redirect_url: null,
          redirect_timing: null,
          created_at: new Date(),
        },
        { subject_id: subjectId, ttl_days: 365 },
      );

      const tokenResult = await db`
        SELECT id, token
        FROM survey_links
        WHERE survey_id = ${survey.id}
          AND subject_id = ${subjectId}
          AND score = ${score}
        LIMIT 1
      `;

      if (tokenResult.length === 0) {
        console.error(`Failed to find survey link for ${subjectId}`);
        continue;
      }

      const surveyLink = tokenResult[0];

      const weekOffset = Math.floor(Math.random() * 12);
      const dayOffset = Math.floor(Math.random() * 7);
      const hourOffset = Math.floor(Math.random() * 24);
      const minuteOffset = Math.floor(Math.random() * 60);

      const respondedAt = new Date(now);
      respondedAt.setDate(now.getDate() - (weekOffset * 7 + dayOffset));
      respondedAt.setHours(respondedAt.getHours() - hourOffset);
      respondedAt.setMinutes(respondedAt.getMinutes() - minuteOffset);

      const comment = getRandomComment(score);

      await db`
        INSERT INTO responses (id, survey_link_id, responded_at, comment)
        VALUES (${randomUUID()}, ${surveyLink.id}, ${respondedAt.toISOString()}, ${comment})
      `;

      totalResponses++;
    }

    console.log(`    ✓ Generated ${surveySubjects} responses`);
  }

  console.log(`✓ Total responses generated: ${totalResponses}`);
};

const main = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: bun run seed <email>");
    process.exit(1);
  }

  console.log(`Seeding data for user: ${email}`);

  try {
    const user = await findOrCreateUser(email);
    console.log(`✓ User found/created: ${user.email}`);

    await seedSurveys(user.business_id);
    await seedResponses(user.business_id);

    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await db.end();
  }
};

main();
