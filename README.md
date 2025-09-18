# ClickNPS

**Get more NPS responses with one-click email surveys.**

Boost your response rates by 10x. No forms to fill, no data to worry about.

## The Problem with Traditional NPS
- Low response rates (5-15%)
- Complex forms create friction  
- PII storage creates compliance headaches

## The ClickNPS Solution
- **85%+ response rates** with one-click email links
- **Zero friction** - click score, done
- **Privacy-first** - we only store your opaque identifiers
- **Zero subscriptions** - $5 per 1000 responses, forever

## How It Works
1. **Mint** - Generate survey links via API
2. **Send** - Embed 0-10 score links in your emails  
3. **Receive** - Get webhook when customer clicks
4. **Analyze** - Use the data however you want

## Privacy-First Design
- **No PII storage** - only your `survey_id` and `subject_id` identifiers
- **Data minimization** - reduced GDPR and compliance risk
- **Your data stays yours** - we're just the delivery mechanism

---

## 🏁 Quick Start

```bash
bun install
bun run dev
```

Then visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Folder Structure

ClickNPS separates backend logic and view creation (HTML) from frontend code (style and interactivity). Here is the high level structure:

```
├── public/           # Static assets (logo, etc)
├── src/
│   ├── client/       # Frontend (component and page CSS + JS)
│   ├── server/       # Server routes, SSR templates using JSX (views)
│   └── types/        # Shared TypeScript types
├── dist/             # Build output
├── package.json      # Project metadata & scripts
└── README.md         # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please open issues or PRs. Use `bun commit` to trigger the [gitmoji](https://gitmoji.dev/) commit message builder.

---

## ☁️ Deploy

Deploy instantly on [Railway](https://railway.com?referralCode=XB1wns):

1. Push to GitHub
2. Create a new Railway project
3. Select your repo
4. Watch it fly!

---

## 📄 License

MIT — free for personal and commercial use.

---

<p align="center">
  <i>Made with ❤️ in Sheffield, UK</i>
</p>
