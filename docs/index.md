# Getting Started

Welcome to **ClickNPS** documentation! This guide will help you get started with our powerful NPS survey platform.

## What is ClickNPS?

ClickNPS is a modern Net Promoter Score (NPS) survey platform that helps you measure customer satisfaction and loyalty. With our simple API and powerful analytics, you can:

- Create beautiful NPS surveys
- Collect customer feedback effortlessly
- Analyze results in real-time
- Integrate with your existing tools

## Quick Start

### 1. Sign Up

Create your free account at [clicknps.com/signup](https://clicknps.com/signup).

### 2. Create Your First Survey

```bash
curl -X POST https://api.clicknps.com/v1/surveys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Satisfaction Survey",
    "question": "How likely are you to recommend us?"
  }'
```

### 3. Distribute Your Survey

Share the survey link with your customers via:

- Email campaigns
- In-app notifications
- SMS messages
- Website embeds

## Key Features

> **Note:** All features are available on all plans. See [pricing](/pricing) for details.

### Real-time Analytics

Track responses as they come in with our live dashboard:

- NPS score calculation
- Response trends over time
- Segmentation by customer attributes
- Export data to CSV or JSON

### API Integration

Integrate ClickNPS into your workflow:

```javascript
const clicknps = require('@clicknps/sdk');

const survey = await clicknps.surveys.create({
  name: 'Onboarding Survey',
  question: 'How was your onboarding experience?'
});
```

### Webhooks

Get notified when responses come in:

| Event | Description |
|-------|-------------|
| `response.created` | New survey response received |
| `response.updated` | Response comment added |
| `survey.completed` | Survey reached target responses |

## Next Steps

- [Installation Guide](/docs/installation) - Detailed setup instructions
- [API Reference](/docs/api/overview) - Complete API documentation
- [Best Practices](/docs/best-practices) - Tips for optimal results

## Need Help?

- 📧 Email: support@clicknps.com
- 📚 [Member Support Center](/settings/support)

---

*Last updated: January 2025*
