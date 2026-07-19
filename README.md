# 🔥 ContentForge — AI Content Repurposing & Automation Platform

> Transform YouTube videos or raw ideas into ready-to-post social media content for Instagram, LinkedIn, and X (Twitter) — powered by OpenAI GPT-4.1 via GitHub Models.

Built for the **OpenAI Codex Hackathon 2026** by **ZeroToShip**.

🔗 **Live Demo**: [ContentForge App](https://content-forge-pearl.vercel.app/) | **Backend API**: Hosted on Render

---

## 🎯 Problem Statement

Content creators and social media managers spend **3-5 hours** repurposing a single YouTube video into platform-specific social media posts, carousel slides, and threads. This process is repetitive, time-consuming, and requires expertise in writing for each platform's unique audience and format.

**Key pain points:**
- Watching a full video, extracting key points, and rewriting for each platform
- Designing carousel slides manually in Canva or Figma for every post
- Maintaining consistent tone and brand voice across Instagram, LinkedIn, and X
- No quality feedback loop — creators post and hope for the best

## 💡 Solution — What ContentForge Does

ContentForge is an **end-to-end AI content pipeline** that takes a YouTube video URL (or a raw idea/topic) and automatically generates:

- **Instagram** — Engaging caption with emojis, 10-15 hashtags, and visual carousel slides
- **LinkedIn** — Professional post with data-driven carousel slides
- **X (Twitter)** — Threaded tweets with punchy carousel slides
- **Viral Hooks** — 3 hook options to maximize scroll-stopping reach
- **ForgeScore™** — AI-powered quality review that scores content on 5 parameters and suggests improvements
- **Iterative Refinement** — Users can refine output with custom instructions or apply AI improvements with one click

**One input → Three platforms → Complete content package in under 60 seconds.**

## 🏆 What Makes ContentForge Unique (Originality)

| Differentiator | Why It Matters |
|---------------|---------------|
| **ForgeScore™ AI Review** | No other tool scores your generated content on engagement, readability, hook strength, platform fit, and CTA — then auto-improves it |
| **Editable Visual Carousel Slides** | Generates platform-specific, branded carousel cards that users can edit inline and download as PNG — not just text |
| **3-Stage AI Pipeline** | Generate → Review → Improve/Refine — mimics a real content team (writer → editor → publisher) |
| **Voice-to-Content** | Speak your idea in 6 Indian languages — converts speech to social media posts |
| **Dual Input Modes** | Works with YouTube URLs (transcript extraction) AND raw ideas/topics — covers both use cases |
| **Free & Accessible** | Built entirely on GitHub Models free tier — no paid API keys needed |

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎬 YouTube Transcript Extraction | Paste any YouTube URL — auto-extracts transcript with multi-method fallback (package + custom scraper + title/description fallback) |
| 💡 Idea Mode | No video? Type your topic or idea and generate content directly |
| 🤖 3 AI Models | GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano — user picks speed vs quality |
| 🎨 Visual Carousel Slides | Editable, downloadable PNG slides per platform with 8 color themes |
| 📊 ForgeScore™ AI Review | Scores content on 5 parameters: engagement, readability, hook strength, platform fit, CTA |
| 🔧 Refine & Regenerate | Tweak output with custom instructions, voice input, or quick suggestion chips |
| ✨ One-Click Improvements | AI suggests improvements → user clicks "Apply" → content is automatically rewritten |
| 🎙️ Voice Input | Speak your idea or refinement instructions (Web Speech API, 6 languages) |
| 🌍 6 Languages | English, Hindi, Kannada, Tamil, Telugu, Malayalam |
| 🎭 6 Tones | Professional, Casual, Gen-Z, Funny, Educational, Motivational |
| 🎨 Brand Customization | Set brand name, social handles, and slide color themes |
| 📄 Export Options | Copy text, download individual/all PNGs, export as TXT, export as PDF |
| 📜 Session History | Access and reload up to 10 previous generations from localStorage |
| 🌓 Dark / Light Mode | Full theme support with persistent preference |
| ⚡ Real-Time Progress | Live step-by-step progress tracker during AI generation |

## 🏗️ Architecture & How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    USER INPUT                            │
│   YouTube URL  ──OR──  Idea/Topic  ──OR──  Voice Input  │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              TRANSCRIPT EXTRACTION                       │
│   youtube-transcript pkg → Custom HTML Scraper →         │
│   Video Title/Description Fallback (3-level fallback)   │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│           AI CONTENT GENERATION (GPT-4.1)               │
│   Structured JSON output with platform-specific content │
│   Instagram caption + LinkedIn post + X thread +        │
│   Carousel slides + Viral hooks                         │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│              FORGESCORE™ AI REVIEW                       │
│   5 scoring parameters → Strengths → Improvements       │
│   One-click "Apply Improvements" auto-rewrites content  │
└─────────────────────┬───────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│            REFINE & EXPORT                               │
│   Custom instructions / Voice refinement →               │
│   Download PNGs / Export PDF / Copy to clipboard        │
└─────────────────────────────────────────────────────────┘
```

## 🔌 API Routes (5 Endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcript` | Extract transcript from YouTube URL (3-level fallback) |
| POST | `/api/generate` | Generate platform-specific social media content |
| POST | `/api/review` | AI quality review — returns ForgeScore™ with 5 metrics |
| POST | `/api/improve` | Auto-apply AI-suggested improvements to existing content |
| POST | `/api/refine` | Refine output based on user's custom instructions |

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite 5 | Fast SPA with hot reload |
| Backend | Node.js + Express 4.18 | Lightweight REST API |
| AI Model | OpenAI GPT-4.1 via GitHub Models API | Free tier, latest model, structured JSON output |
| Transcript | youtube-transcript + custom fallback scraper | Reliable extraction with 3-level fallback |
| Image Export | html2canvas (scale: 2x) | High-quality PNG carousel export |
| Voice | Web Speech API (browser-native) | Zero-dependency voice input |
| Deployment | Vercel (frontend) + Render (backend) | Free hosting |

## 🧠 AI Models Available

| Model | Use Case | Speed | Quality |
|-------|----------|-------|---------|
| GPT-4.1 | Best quality, detailed content | Standard | ⭐⭐⭐⭐⭐ |
| GPT-4.1 Mini | Great balance of speed & quality | Fast | ⭐⭐⭐⭐ |
| GPT-4.1 Nano | Quick, concise output | Fastest | ⭐⭐⭐ |

All models accessed via **GitHub Models** (free tier) using the OpenAI SDK — **zero cost to run**.

## 🚀 Future Vision & Roadmap

ContentForge is built as a **foundation for a complete content automation system**. Here is the roadmap:

### Phase 2 — AI-Generated Visual Media
| Feature | Technology | Impact |
|---------|-----------|--------|
| AI-generated carousel images | DALL-E 3 / Midjourney API | Unique, visually stunning slides instead of HTML/CSS cards |
| AI-generated short videos | Runway ML / OpenAI Sora | Auto-generate Reels, Shorts, and TikTok clips from video content |
| AI voiceover for videos | ElevenLabs / OpenAI TTS | Add narration to generated video clips |

### Phase 3 — Full Content Automation Pipeline
| Feature | Description |
|---------|-------------|
| **YouTube Channel Monitoring** | Connect any YouTube channel → ContentForge auto-detects new uploads |
| **Auto-Analyze & Generate** | New video detected → transcript extracted → social content generated automatically |
| **Two Posting Modes** | **Auto-post mode**: System publishes directly to Instagram, LinkedIn, X without user intervention. **Review mode**: User reviews generated content, refines if needed, then publishes |
| **Scheduled Posting** | Queue posts for optimal engagement times per platform |
| **Multi-Channel Dashboard** | Manage multiple YouTube channels and social accounts from one dashboard |

### Phase 4 — Analytics & Optimization
| Feature | Description |
|---------|-------------|
| **Post Performance Tracking** | Track likes, shares, comments across platforms |
| **AI Learning Loop** | ForgeScore™ improves over time based on actual engagement data |
| **A/B Hook Testing** | Test multiple hooks and auto-select the best performer |

> **Why these features are not in the current build:** The current prototype is built entirely on **free APIs** (GitHub Models). AI image generation (DALL-E), video generation (Sora/Runway), and social media posting APIs (Instagram Graph API, LinkedIn API, X API) require **paid subscriptions and API credits**. The architecture is designed to plug in these services when available — the foundation is ready to scale.

## 📁 Project Structure

```
contentforge/
├── backend/
│   ├── server.js          # Express API (5 routes, 3-level transcript fallback)
│   ├── package.json
│   └── .env               # GITHUB_TOKEN (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app (~960 lines)
│   │   ├── App.css        # All styles — dark/light mode (~2400 lines)
│   │   └── ImageCards.jsx  # Carousel renderer + export logic
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── README.md
└── DEMO_VIDEO_SCRIPT.md
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A GitHub Personal Access Token (with GitHub Models access)

### 1. Clone the repo
```bash
git clone https://github.com/surendr-Reddy/ContentForge
cd contentforge
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file:
```
GITHUB_TOKEN=your_github_pat_here
```

Start the backend:
```bash
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## 🌐 Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com) — auto-builds from GitHub
- **Backend**: Deployed on [Render](https://render.com) — free tier with environment variables
- **Environment Variable**: Set `VITE_API_URL` on Vercel pointing to the Render backend URL

## 📜 License

MIT

---

Built with ❤️ by **ZeroToShip** for the **OpenAI Codex Hackathon 2026**

**Powered by OpenAI GPT-4.1 via GitHub Models**
