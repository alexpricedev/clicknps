# ClickNPS – Product Requirements Document (PRD)

## 1. Overview
ClickNPS is a lightweight, developer-friendly service for capturing Net Promoter Score (NPS) feedback via **one-click survey links**.  
Customers mint unique links tied to their own `survey_id` and `subject_id`, embed them in emails, and receive responses through a webhook.  
No customer PII is stored by ClickNPS.

Goal: Provide the **simplest, cheapest, most privacy-safe NPS tool** for small businesses and SaaS teams.

---

## 2. Core Value Proposition
- **Low friction**: Respondents click directly on an NPS score link (0–10) inside an email.  
- **No PII handling**: Only opaque identifiers are used (`survey_id`, `subject_id`).  
- **Instant feedback**: Customers receive results via webhook in near real-time.  
- **Transparent pricing**: Flat $5 per 1 000 responses. No subscriptions. No expiry.  
- **Optional free-text capture**: A hosted thank-you page prompts users for optional comments.

---

## 3. Key User Stories
1. As a **developer**, I want to mint NPS links for my users without managing survey infrastructure.  
2. As a **marketing/CS manager**, I want higher response rates by embedding one-click scores in email templates.  
3. As a **business owner**, I want clear per-response pricing without ongoing subscriptions.  
4. As a **security/compliance lead**, I want to ensure no PII is stored by the vendor.  

---

## 4. Features

### 4.1 Survey Link Minting (API)
- `POST /links/mint`
- Inputs:
  - `survey_id` (string, required)
  - `subject_id` (string, required) – opaque identifier
  - `ttl` (optional, default 30 days)
  - `redirect_url` (optional, default: ClickNPS hosted thank-you page)
- Response:
  - JSON with 11 score links (0–10)
  - Example HTML snippet (optional flag) for quick email embed

### 4.2 Response Capture
- Each click logs:
  - `survey_id`
  - `subject_id`
  - `score` (0–10)
  - `timestamp`
- Deduplication: only first click per subject per survey counts; subsequent clicks ignored.

### 4.3 Hosted Thank-You Page
- Default page shows: “Thanks for your feedback! Care to share more?”  
- Provides a free-text comment box (optional for user).  
- If submitted, comment is attached to the webhook payload.

### 4.4 Webhook Delivery
- Configurable endpoint per customer.  
- Webhook fires after **90s delay** to allow time for optional comment.  
- **Payload example**:

```json
{
  "survey_id": "abc123",
  "subject_id": "user42",
  "score": 9,
  "comment": "Loving the product!",
  "timestamp": "2025-09-15T10:01:00Z"
}
```

- Retries with exponential backoff on failure (up to 24h).

### 4.5 Dashboard (later phase, optional)
- Simple usage stats: responses used, remaining credits, top surveys, response breakdown.

---

## 5. Pricing & Credits
- **$5 per 1 000 responses** (credits).  
- Credits never expire.  
- One response = one score click (comment included free).  
- Payment via Stripe.  

---

## 6. Non-Functional Requirements
- **Security**:  
  - No PII (emails, names) stored.  
  - All data transport over HTTPS.  
- **Scalability**:  
  - Queue system for webhook delays and retries (e.g. Redis, SQS, or Bun worker).  
- **Reliability**:  
  - Webhook retries ensure delivery guarantees.  
- **Compliance**:  
  - Data minimisation = reduced GDPR/PII risk.  

---

## 7. Out of Scope (MVP)
- Multi-language thank-you pages.  
- Custom theming for thank-you page.  
- Multi-survey dashboards.  
- In-app analytics beyond basic usage counts.  

---

## 8. Success Metrics
- Time to first response < 5 minutes for a new customer.  
- 90%+ delivery success on webhooks within 1h.  
- First 10 paying customers reach >80% response rate on email surveys.  

---
