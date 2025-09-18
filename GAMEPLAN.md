# ClickNPS Implementation Game Plan

## Overview
This document outlines the phased implementation strategy for building ClickNPS, a privacy-first, one-click NPS survey tool. The project will leverage the existing Bun/TypeScript/JSX starter kit infrastructure.

---

## Phase 0: Foundation & Setup ✅
**Status**: COMPLETE  
**Timeline**: Day 1

### Completed
- [x] Remove existing .git and reinitialize repository
- [x] Update project name to ClickNPS throughout codebase
- [x] Update README with ClickNPS branding and value proposition
- [x] Update email templates with ClickNPS branding
- [x] Install missing TypeScript dependency
- [x] Verify all tests pass and linting is clean

---

## Phase 1: Core Data Model & Database
**Status**: IN PROGRESS
**Timeline**: Days 2-3

### Goals
- Set up core database schema for NPS functionality
- Implement data models with privacy-first design

### Tasks
- [ ] Create database migrations for core tables:
  - `customers` - API key management, webhook URLs
  - `surveys` - Survey configurations 
  - `survey_links` - Generated links with TTL
  - `responses` - NPS scores and timestamps
  - `comments` - Optional feedback text
  - `credits` - Credit balance tracking
  - `webhook_queue` - Delayed webhook delivery
- [ ] Implement database service layer with TypeScript types
- [ ] Add database seed scripts for development
- [ ] Write comprehensive tests for data layer

### Success Criteria
- Database migrations run successfully
- All CRUD operations tested
- Type-safe database queries

---

## Phase 2: Authentication & Customer Management
**Status**: NOT STARTED  
**Timeline**: Days 4-5

### Goals
- Adapt existing auth system for customer accounts
- Implement API key generation and management

### Tasks
- [ ] Extend auth system for customer registration
- [ ] Create customer dashboard layout
- [ ] Implement API key generation and rotation
- [ ] Add webhook URL configuration UI
- [ ] Create customer settings page
- [ ] Implement session management for dashboard
- [ ] Add tests for auth flows

### Success Criteria
- Customers can register and sign in
- API keys can be generated and managed
- Webhook URLs can be configured

---

## Phase 3: Link Minting API
**Status**: NOT STARTED  
**Timeline**: Days 6-8

### Goals
- Build the core `/links/mint` API endpoint
- Generate unique, trackable survey links

### Tasks
- [ ] Create `POST /api/v1/links/mint` endpoint
- [ ] Implement link generation logic:
  - Generate unique tokens for each score (0-10)
  - Store survey_id and subject_id mappings
  - Apply TTL settings
- [ ] Add API authentication middleware
- [ ] Create link validation service
- [ ] Generate HTML email snippet (optional response)
- [ ] Rate limiting for API endpoints
- [ ] Comprehensive API tests
- [ ] API documentation

### Success Criteria
- API generates 11 unique links per request
- Links expire after TTL
- API requires valid authentication
- Returns properly formatted JSON response

---

## Phase 4: Response Capture & Thank You Page
**Status**: NOT STARTED  
**Timeline**: Days 9-11

### Goals
- Implement click tracking and response capture
- Build hosted thank-you page with comment form

### Tasks
- [ ] Create response capture endpoint (`GET /r/:token`)
- [ ] Implement deduplication logic (first click only)
- [ ] Build thank-you page template:
  - Score confirmation message
  - Optional comment form
  - Customizable redirect option
- [ ] Create comment submission endpoint
- [ ] Add CSRF protection for comment form
- [ ] Store responses with timestamps
- [ ] Add response validation and sanitization
- [ ] Test response capture flows

### Success Criteria
- Clicks are captured and deduplicated correctly
- Thank-you page renders properly
- Comments are optional and stored securely
- No PII is collected or stored

---

## Phase 5: Webhook System & Queue
**Status**: NOT STARTED  
**Timeline**: Days 12-14

### Goals
- Implement delayed webhook delivery system
- Build reliable retry mechanism

### Tasks
- [ ] Set up Redis or in-memory queue for webhook jobs
- [ ] Create webhook service with 90s delay
- [ ] Implement webhook payload formatting
- [ ] Add exponential backoff retry logic (up to 24h)
- [ ] Create webhook status tracking
- [ ] Add webhook signature/verification
- [ ] Build webhook testing tools for customers
- [ ] Monitor and log webhook deliveries
- [ ] Test webhook reliability

### Success Criteria
- Webhooks fire after 90s delay
- Failed webhooks retry with backoff
- Webhook payloads match specification
- 90%+ delivery success rate

---

## Phase 6: Payment Integration
**Status**: NOT STARTED  
**Timeline**: Days 15-17

### Goals
- Integrate Stripe for credit purchases
- Implement credit consumption tracking

### Tasks
- [ ] Set up Stripe account and SDK
- [ ] Create pricing page
- [ ] Implement credit purchase flow:
  - $5 per 1,000 responses
  - No expiration
- [ ] Build credit balance tracking
- [ ] Create checkout and success pages
- [ ] Implement credit consumption on response
- [ ] Add payment webhooks for Stripe
- [ ] Create billing history page
- [ ] Test payment flows end-to-end

### Success Criteria
- Customers can purchase credits via Stripe
- Credits are properly tracked and consumed
- Payment flow is smooth and secure

---

## Phase 7: Customer Dashboard
**Status**: NOT STARTED  
**Timeline**: Days 18-20

### Goals
- Build comprehensive customer dashboard
- Provide usage analytics and insights

### Tasks
- [ ] Create dashboard home with key metrics
- [ ] Build survey management interface:
  - List all surveys
  - Response counts
  - NPS score calculation
  - Response timeline
- [ ] Add credit balance display
- [ ] Create usage statistics:
  - Responses this month
  - Top performing surveys
  - Response rate trends
- [ ] Build API key management UI
- [ ] Add webhook logs viewer
- [ ] Implement data export (CSV)
- [ ] Mobile-responsive design

### Success Criteria
- Dashboard shows real-time metrics
- Easy navigation and clean UI
- All features accessible on mobile

---

## Phase 8: Testing & Hardening
**Status**: NOT STARTED  
**Timeline**: Days 21-23

### Goals
- Comprehensive testing and security review
- Performance optimization

### Tasks
- [ ] End-to-end integration tests
- [ ] Load testing for API endpoints
- [ ] Security audit:
  - Input validation
  - SQL injection prevention
  - XSS protection
  - Rate limiting
- [ ] Performance optimization:
  - Database query optimization
  - Caching strategy
  - CDN setup for static assets
- [ ] Error handling and logging
- [ ] Monitoring setup (error tracking, uptime)
- [ ] Documentation updates

### Success Criteria
- 100% test coverage for critical paths
- All security vulnerabilities addressed
- <200ms API response times
- 99.9% uptime target

---

## Phase 9: Launch Preparation
**Status**: NOT STARTED  
**Timeline**: Days 24-25

### Goals
- Prepare for production deployment
- Create launch materials

### Tasks
- [ ] Production environment setup (Railway)
- [ ] Configure production database
- [ ] Set up domain and SSL
- [ ] Create landing page
- [ ] Write API documentation
- [ ] Create customer onboarding guide
- [ ] Set up support email
- [ ] Prepare demo account
- [ ] Create example integrations
- [ ] Final testing in production

### Success Criteria
- Production environment is stable
- Documentation is complete
- Demo account works perfectly
- Landing page converts visitors

---

## Phase 10: Post-Launch Enhancements
**Status**: FUTURE  
**Timeline**: Ongoing

### Potential Features
- [ ] Multi-language support for thank-you page
- [ ] Custom branding options
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Zapier/webhook.site integrations
- [ ] A/B testing for survey timing
- [ ] Email campaign integration
- [ ] CSAT and CES survey types
- [ ] White-label options

---

## Technical Decisions

### Stack (Existing)
- **Runtime**: Bun
- **Language**: TypeScript
- **Templates**: JSX (server-side)
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Testing**: Bun test

### Additional Services Needed
- **Queue**: Redis or Bun built-in queue
- **Payments**: Stripe
- **Deployment**: Railway
- **Monitoring**: TBD (Sentry, LogRocket, etc.)
- **Analytics**: TBD (Plausible, PostHog, etc.)

---

## Risk Mitigation

### Technical Risks
- **Webhook reliability**: Implement robust retry logic and monitoring
- **Scale concerns**: Design for horizontal scaling from day one
- **Data privacy**: Never store PII, regular security audits

### Business Risks
- **Low adoption**: Focus on developer experience and documentation
- **Price sensitivity**: Transparent, usage-based pricing with no surprises
- **Competition**: Differentiate on privacy and simplicity

---

## Success Metrics

### Week 1 Post-Launch
- [ ] 10 registered customers
- [ ] 100 survey responses captured
- [ ] 95%+ webhook delivery rate

### Month 1 Post-Launch
- [ ] 50 paying customers
- [ ] 10,000 survey responses
- [ ] <5 minute setup time
- [ ] >80% response rate for customers

### Month 3 Post-Launch
- [ ] 200 paying customers
- [ ] $1,000 MRR
- [ ] 99.9% uptime
- [ ] 5-star developer experience ratings

---

## Notes
- Each phase builds on the previous one
- Testing is integrated into each phase, not separate
- MVP is achievable after Phase 6 (payment integration)
- Phases 7-9 polish the product for launch
- Maintain privacy-first approach throughout