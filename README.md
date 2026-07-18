# 🔥 ContentForge — AI Content Repurposing Platform

> Transform YouTube videos or raw ideas into ready-to-post social media content for Instagram, LinkedIn, and X (Twitter) — powered by OpenAI GPT-4.1 via GitHub Models.

Built for the **OpenAI Codex Hackathon 2026** by **ZeroToShip**.

---

## 🎯 Problem

Content creators spend **3-5 hours** repurposing a single YouTube video into platform-specific social media posts, carousel slides, and threads. ContentForge reduces this to **under 60 seconds**.

## 💡 Solution

ContentForge takes a YouTube video URL (or a raw idea) and automatically generates:
- **Instagram** — Caption, hashtags, and visual carousel slides
- **LinkedIn** — Professional post with carousel slides
- **X (Twitter)** — Threaded tweets with carousel slides
- **Viral Hooks** — Multiple hook options to maximize reach
- **ForgeScore™** — AI quality review with actionable improvement suggestions

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎬 YouTube Transcript Extraction | Paste any YouTube URL — auto-extracts transcript |
| 💡 Idea Mode | No video? Type your idea and generate content directly |
| 🤖 3 AI Models | GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano — pick speed vs quality |
| 🎨 Visual Carousel Slides | Editable, downloadable PNG slides per platform |
| 📊 ForgeScore™ AI Review | Engagement scoring, strengths, and improvements |
| 🔧 Refine & Regenerate | Tweak output with custom instructions or quick suggestions |
| ✨ Apply Improvements | One-click apply AI-suggested improvements |
| 🎙️ Voice Input | Speak your idea or refinement (Web Speech API, 6 languages) |
| 🌍 6 Languages | English, Hindi, Kannada, Tamil, Telugu, Malayalam |
| 🎭 6 Tones | Professional, Casual, Gen-Z, Funny, Educational, Motivational |
| 🎨 8 Color Themes | Customize carousel slide branding |
| 📄 Export Options | Copy text, download PNGs, export as PDF |
| 📜 Session History | Access previous generations |
| 🌓 Dark / Light Mode | Full theme support |

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite 5
- **Backend**: Node.js + Express 4.18
- **AI**: OpenAI GPT-4.1 via GitHub Models API
- **Transcript**: youtube-transcript package
- **Image Export**: html2canvas
- **Voice**: Web Speech API (browser-native)

## 📁 Project Structure

```
contentforge/
├── backend/
│   ├── server.js          # Express API (5 routes)
│   ├── package.json
│   └── .env               # GITHUB_TOKEN (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── App.css        # All styles (dark/light)
│   │   └── ImageCards.jsx  # Carousel slide renderer
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A GitHub Personal Access Token (with GitHub Models access)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/contentforge.git
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

## 🔌 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcript` | Extract transcript from YouTube URL |
| POST | `/api/generate` | Generate social media content from transcript/idea |
| POST | `/api/review` | AI quality review (ForgeScore™) |
| POST | `/api/improve` | Apply AI-suggested improvements |
| POST | `/api/refine` | Refine output with custom instructions |

## 🏗️ How It Works

```
YouTube URL / Idea
        ↓
   Transcript Extraction (youtube-transcript)
        ↓
   AI Content Generation (GPT-4.1)
        ↓
   Platform-Specific Output (Instagram, LinkedIn, X)
        ↓
   Visual Carousel Slides (html2canvas)
        ↓
   ForgeScore™ AI Review (quality scoring)
        ↓
   Refine / Improve / Export
```

## 🧠 AI Models Used

| Model | Use Case | Speed |
|-------|----------|-------|
| GPT-4.1 | Best quality, detailed content | Standard |
| GPT-4.1 Mini | Great balance of speed & quality | Fast |
| GPT-4.1 Nano | Quick, concise output | Fastest |

All models accessed via **GitHub Models** (free tier) using the OpenAI SDK.

## 📜 License

MIT

---

Built with ❤️ by **ZeroToShip** for the OpenAI Codex Hackathon 2026
