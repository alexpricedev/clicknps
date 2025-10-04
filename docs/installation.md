# Installation Guide

This guide covers everything you need to install and configure ClickNPS for your application.

## Prerequisites

Before you begin, ensure you have:

- ✅ An active ClickNPS account
- ✅ API key (available in your [dashboard](/settings/api-keys))
- ✅ Node.js 18+ or Python 3.8+ (for SDK installation)

## Installation Methods

### Option 1: JavaScript/Node.js

Install the official SDK via npm:

```bash
npm install @clicknps/sdk
```

Or using yarn:

```bash
yarn add @clicknps/sdk
```

Or using bun:

```bash
bun add @clicknps/sdk
```

#### Configuration

```javascript
import ClickNPS from '@clicknps/sdk';

const client = new ClickNPS({
  apiKey: process.env.CLICKNPS_API_KEY,
  // Optional: custom base URL
  baseUrl: 'https://api.clicknps.com'
});
```

### Option 2: Python

Install via pip:

```bash
pip install clicknps
```

#### Configuration

```python
from clicknps import Client

client = Client(
    api_key=os.environ['CLICKNPS_API_KEY']
)
```

### Option 3: REST API

Use the REST API directly with any HTTP client:

```bash
curl https://api.clicknps.com/v1/surveys \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Environment Variables

We recommend storing your API key in environment variables:

```bash
# .env file
CLICKNPS_API_KEY=sk_live_abc123xyz789
CLICKNPS_WEBHOOK_SECRET=whsec_def456uvw012
```

> ⚠️ **Security Warning:** Never commit API keys to version control. Use environment variables or secret management services.

## Verification

Test your installation:

```javascript
// Verify API connection
const surveys = await client.surveys.list();
console.log(`✅ Connected! Found ${surveys.length} surveys`);
```

Expected output:

```
✅ Connected! Found 3 surveys
```

## Troubleshooting

### Common Issues

#### Invalid API Key Error

```
Error: Authentication failed. Invalid API key.
```

**Solution:** Check that your API key is correct and active in [API Keys settings](/settings/api-keys).

#### Network Timeout

```
Error: Request timeout after 30000ms
```

**Solution:** Check your network connection and firewall settings. The API endpoint is `api.clicknps.com` on port `443`.

#### Rate Limit Exceeded

```
Error: Rate limit exceeded. Retry after 60 seconds.
```

**Solution:** Implement exponential backoff or upgrade your plan for higher limits.

## Next Steps

- [API Overview](/docs/api/overview) - Learn about available endpoints
- [Create Your First Survey](/docs/quickstart) - Step-by-step tutorial
- [Webhooks Setup](/docs/webhooks) - Real-time notifications

---

Need more help? [Contact support](/settings/support)
