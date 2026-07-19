require("dotenv").config();
// Disable SSL verification for corporate proxy/firewall environments (e.g., Zscaler, company VPN)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { YoutubeTranscript } = require("youtube-transcript");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to GitHub Models (FREE) - uses OpenAI SDK with GitHub's endpoint
const githubToken = process.env.GITHUB_TOKEN || process.env.OPENAI_API_KEY || "demo-token";
if (!process.env.GITHUB_TOKEN && !process.env.OPENAI_API_KEY) {
  console.warn("[startup] No GitHub/OpenAI token found in environment. Local transcript checks can still run, but AI generation will be unavailable until a token is configured.");
}

const client = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: githubToken,
});

// Helper: Extract YouTube video ID from URL
function getVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractInlineJson(html, globalName) {
  const startToken = `var ${globalName} = `;
  const startIndex = html.indexOf(startToken);
  if (startIndex === -1) return null;

  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function decodeHtmlEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Extract video title and description from YouTube page HTML (used as fallback)
function extractVideoMeta(html) {
    let title = "";
    let description = "";

    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="(.*?)"/s);
    if (ogTitle) {
        title = decodeHtmlEntities(ogTitle[1]).trim();
    } else {
        const titleMatch = html.match(/<title>(.*?)<\/title>/s);
        if (titleMatch) {
            title = decodeHtmlEntities(titleMatch[1])
                .replace(/\s*-\s*YouTube\s*$/, "")
                .trim();
        }
    }

    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="(.*?)"/s);
    if (ogDesc) {
        description = decodeHtmlEntities(ogDesc[1]).trim();
    }

    const playerResponse = extractInlineJson(html, "ytInitialPlayerResponse");
    if (playerResponse) {
        const vidDetails = playerResponse?.videoDetails;

        if (vidDetails?.title)
            title = vidDetails.title;

        if (vidDetails?.shortDescription)
            description = vidDetails.shortDescription;

        if (vidDetails?.keywords?.length) {
            description +=
                "\n\nTopics: " +
                vidDetails.keywords.slice(0, 15).join(", ");
        }
    }

    return { title, description };
}

async function fetchYouTubePage(videoId) {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const pageResponse = await fetch(pageUrl, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    if (!pageResponse.ok) {
        throw new Error(
            `YouTube page unreachable (${pageResponse.status})`
        );
    }

    return await pageResponse.text();
}

async function fetchYouTubeOEmbed(videoId) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const response = await fetch(oEmbedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube metadata unavailable (${response.status})`);
  }

  return await response.json();
}

function parseTranscriptXml(xml, languageCode = 'en') {
  const blocks = [...xml.matchAll(/<text start="([^"]+)" dur="([^"]+)">([^<]*)<\/text>/g)];
  const transcripts = blocks
    .map((match) => decodeHtmlEntities(match[3]).trim())
    .filter(Boolean);

  if (transcripts.length === 0) {
    throw new Error('No transcript segments were found in the returned caption XML.');
  }

  return transcripts.map((text) => ({ text, languageCode }));
}

async function fetchTranscriptFromVideoPage(videoId) {
    const pageHtml = await fetchYouTubePage(videoId);

    const playerResponse = extractInlineJson(
        pageHtml,
        "ytInitialPlayerResponse"
    );

    const captionTracks =
        playerResponse?.captions
            ?.playerCaptionsTracklistRenderer
            ?.captionTracks;

    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
        throw new Error(
            "Transcript is disabled or unavailable on this video."
        );
    }

    const preferredTrack =
        captionTracks.find(track => track.languageCode === "en")
        || captionTracks[0];

    let captionUrl = preferredTrack?.baseUrl;

    if (!captionUrl) {
        throw new Error(
            "No caption URL was returned for this video."
        );
    }

    captionUrl = captionUrl.replace(/&variant=[^&]*/g, "");

    const transcriptResponse = await fetch(captionUrl, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    if (!transcriptResponse.ok) {
        throw new Error(
            "Caption XML could not be loaded from YouTube."
        );
    }

    const transcriptXml = await transcriptResponse.text();

    if (!transcriptXml || transcriptXml.trim().length === 0) {
        throw new Error(
            "Caption XML was empty — YouTube may be blocking this server."
        );
    }

    return parseTranscriptXml(
        transcriptXml,
        preferredTrack?.languageCode || "en"
    );
}

async function fetchTranscriptWithRetry(videoId, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await YoutubeTranscript.fetchTranscript(videoId);
    } catch (error) {
      lastError = error;
      try {
        const fallbackTranscript = await fetchTranscriptFromVideoPage(videoId);
        if (Array.isArray(fallbackTranscript) && fallbackTranscript.length > 0) {
          return fallbackTranscript;
        }
      } catch (fallbackError) {
        lastError = fallbackError;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }

  throw lastError;
}

// ROUTE 1: Get transcript from YouTube video
app.post("/api/transcript", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Please provide a YouTube URL" });
    }

    const videoId = getVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    let transcript;

    try {
        const segments = await fetchTranscriptWithRetry(videoId, 2);

        transcript = segments
            .map(item => item.text)
            .join(" ");

    } catch (transcriptError) {

        console.log(
            "All transcript methods failed:",
            transcriptError.message
        );

      // FALLBACK:
      // Try metadata first, then the YouTube page HTML if oEmbed is not available.

        try {

        let meta = null;

        try {
          const oEmbed = await fetchYouTubeOEmbed(videoId);
          meta = {
            title: oEmbed?.title || "",
            description: oEmbed?.author_name
              ? `By ${oEmbed.author_name}`
              : "",
          };
        } catch (oEmbedError) {
          console.log(
            "YouTube oEmbed fallback failed:",
            oEmbedError.message
          );
        }

        if (!meta?.title) {
          const pageHtml = await fetchYouTubePage(videoId);
          meta = extractVideoMeta(pageHtml);
        }

            if (meta.title) {

                console.log(
                    "Using video title/description fallback for:",
                    meta.title
                );

                const fallbackText = [
                    `YouTube Video Title: ${meta.title}`,
                    meta.description
                        ? `\nVideo Description: ${meta.description}`
                        : "",
                    "\n\nNote: The full transcript could not be extracted, but generate engaging social media content based on the title and description."
                ].join("");

                return res.json({
                    transcript: fallbackText,
                    videoId,
                    fallback: true,
                });

            }

        } catch (metaError) {

            console.log(
                "Even title fallback failed:",
                metaError.message
            );

        }

        throw transcriptError;
    }

    if (!transcript.trim()) {
      return res.status(422).json({
        error: "No usable transcript was found for this video. Try a different public video with captions enabled.",
      });
    }

    res.json({ transcript, videoId });
  } catch (error) {
    console.error("Transcript error:", error.message);

    const message = error?.message || "Unknown transcript error";
    if (message.toLowerCase().includes("transcript") || message.toLowerCase().includes("caption") || message.toLowerCase().includes("subtitles")) {
      return res.status(422).json({
        error: "Could not get transcript. Make sure the video has captions/subtitles enabled and is publicly accessible.",
      });
    }

    res.status(500).json({
      error: "Transcript service is temporarily unavailable. Please try again in a moment.",
    });
  }
});

// ROUTE 2: Generate social media content using AI
app.post("/api/generate", async (req, res) => {
  try {
    const { transcript, tone, language, model } = req.body;

    if (!process.env.GITHUB_TOKEN && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "AI generation is not configured on this server yet. Add GITHUB_TOKEN or OPENAI_API_KEY to enable model requests.",
      });
    }

    if (!transcript) {
      return res.status(400).json({ error: "No transcript provided" });
    }

    const toneLabel = tone || "Professional";
    const lang = language || "English";
    const aiModel = ["openai/gpt-4.1", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"].includes(model) ? model : "openai/gpt-4.1";

    // Trim transcript if too long (keep first 3000 words)
    const trimmedTranscript = transcript.split(" ").slice(0, 3000).join(" ");

    const response = await client.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are a social media content expert and visual content strategist. 
          Given content (a YouTube video transcript or a user's idea), generate engaging social media 
          content with ready-to-post carousel slides for multiple platforms.

          TONE: Write all content in a ${toneLabel} tone.
          ${toneLabel === 'Gen-Z' ? 'Use slang, abbreviations, memes, and internet culture references.' : ''}
          ${toneLabel === 'Funny' ? 'Use humor, wit, puns, and comedic timing.' : ''}
          ${toneLabel === 'Casual' ? 'Write like talking to a friend, relaxed and conversational.' : ''}
          ${toneLabel === 'Educational' ? 'Focus on teaching, include data points, be clear and structured.' : ''}
          ${toneLabel === 'Motivational' ? 'Be inspiring, use power words, include calls to action.' : ''}

          LANGUAGE: Generate ALL content in ${lang}.

          You MUST respond with ONLY valid JSON, no extra text before or after. IMPORTANT:
           Do NOT use actual newlines inside JSON string values — use \\n instead.

          IMPORTANT RULES FOR CAROUSEL SLIDES:
          - Short videos (under 5 min): generate exactly 3 slides (hook + 1 key point + CTA)
          - Medium videos (5-15 min): generate exactly 4 slides (hook + 2 key points + CTA)
          - Long videos (15+ min): generate exactly 5-6 slides (hook + 3-4 key points + CTA)
          - NEVER generate more than 6 slides per platform
          - Pick only the MOST impactful points — quality over quantity
          - First slide is always a bold hook/question to stop scrolling
          - Last slide is always a call-to-action (follow, save, share)
          - Middle slides each cover ONE powerful insight with a clear takeaway

          Use this EXACT JSON format:
          {
            "summary": "A brief 2-3 sentence summary of the video content",
            "instagram": {
              "caption": "An engaging Instagram caption with emojis (under 200 words)",
              "hashtags": "#hashtag1 #hashtag2 ... (10-15 relevant hashtags)",
              "carousel": [
                {"title": "Hook question (max 10 words)", "body": "1-2 sentence teaser", "emoji": "relevant emoji"},
                {"title": "Key Point title", "body": "2-3 sentences explaining clearly", "emoji": "relevant emoji"},
                {"title": "Save & Share!", "body": "Follow @contentforge for more!", "emoji": "🔥"}
              ]
            },
            "linkedin": {
              "post": "A professional LinkedIn post (use \\n for line breaks, 150-250 words)",
              "carousel": [
                {"title": "Professional hook", "body": "Business-oriented teaser", "emoji": "💡"},
                {"title": "Key Insight", "body": "Professional explanation with data/facts", "emoji": "📊"},
                {"title": "Connect & Discuss", "body": "Professional CTA to comment and share", "emoji": "🤝"}
              ]
            },
            "twitter": {
              "thread": ["Tweet 1 (hook)", "Tweet 2 (insight)", "Tweet 3 (takeaway)", "Tweet 4 (CTA)"],
              "carousel": [
                {"title": "Bold hook", "body": "Short punchy text for X audience", "emoji": "🚨"},
                {"title": "Key Point", "body": "Concise insight", "emoji": "🔬"},
                {"title": "Follow for more!", "body": "Repost & follow @contentforge", "emoji": "𝕏"}
              ]
            },
            "hooks": ["Hook option 1", "Hook option 2", "Hook option 3"]
          }

          NOTE: The carousel arrays above show 3 slides as example — you should generate MORE slides 
          based on how many key points the video actually has. Adapt the number naturally. Instagram 
          tone = casual + emojis, LinkedIn tone = professional + data-driven, Twitter tone = bold + punchy + short.

          Remember: output ONLY the JSON object, nothing else.`
        },
        {
          role: "user",
          content: `Here is the content to create social media posts from. Generate in ${lang} language with a
           ${toneLabel} tone. It could be a YouTube video transcript or a user's own idea/topic:\n\n${trimmedTranscript}`
        }
      ],
      temperature: 0.7,
    });

    const rawContent = response.choices[0].message.content;
    console.log("Raw AI response (first 200 chars):", rawContent.substring(0, 200));
    
    // Clean the response: remove markdown code fences if present
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find the JSON object
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error("AI did not return valid JSON");
    }
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);
    
    // Try parsing directly first
    let content;
    try {
      content = JSON.parse(jsonStr);
    } catch (e) {
      // If that fails, fix unescaped newlines ONLY inside string values
      // Replace newlines that appear between quotes (inside string values)
      jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      });
      content = JSON.parse(jsonStr);
    }

    res.json(content);
  } catch (error) {
    console.error("AI generation error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      error: "AI generation failed: " + error.message,
    });
  }
});

// ROUTE 3: AI Quality Review
app.post("/api/review", async (req, res) => {
  try {
    const { content, model } = req.body;

    if (!process.env.GITHUB_TOKEN && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "AI review is not configured on this server yet. Add GITHUB_TOKEN or OPENAI_API_KEY to enable model requests.",
      });
    }

    if (!content) {
      return res.status(400).json({ error: "No content to review" });
    }

    const aiModel = ["openai/gpt-4.1", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"].includes(model) ? model : "openai/gpt-4.1";

    const response = await client.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are a social media quality reviewer and engagement expert. Review the generated 
          social media content and provide scores and feedback.

          You MUST respond with ONLY valid JSON. IMPORTANT: Do NOT use actual newlines inside JSON string values — use \\n instead.

          Use this exact format:
          {
            "overall_score": 8.5,
            "scores": {
              "engagement": {"score": 8, "feedback": "Brief feedback on engagement potential"},
              "readability": {"score": 9, "feedback": "Brief feedback on readability"},
              "hook_strength": {"score": 7, "feedback": "Brief feedback on hook quality"},
              "platform_fit": {"score": 8, "feedback": "Brief feedback on platform optimization"},
              "call_to_action": {"score": 7, "feedback": "Brief feedback on CTA effectiveness"}
            },
            "top_strengths": ["Strength 1", "Strength 2", "Strength 3"],
            "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
            "verdict": "One sentence overall verdict"
          }

          Be honest but constructive. Scores are out of 10.`
        },
        {
          role: "user",
          content: `Review this social media content package:\n\nInstagram: ${content.instagram?.caption}\n\nLinkedIn:
           ${content.linkedin?.post}\n\nTwitter Thread: ${content.twitter?.thread?.join(' | ')}\n\nHooks: ${content.hooks?.join(' | ')}`
        }
      ],
      temperature: 0.5,
    });

    const rawContent = response.choices[0].message.content;
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error("AI did not return valid JSON");
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);

    let review;
    try {
      review = JSON.parse(jsonStr);
    } catch (e) {
      jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      });
      review = JSON.parse(jsonStr);
    }

    res.json(review);
  } catch (error) {
    console.error("Review error:", error.message);
    res.status(500).json({ error: "AI review failed: " + error.message });
  }
});

// ROUTE 4: Apply improvements — regenerate content based on review feedback
app.post("/api/improve", async (req, res) => {
  try {
    const { content, improvements, tone, language, model } = req.body;

    if (!content || !improvements) {
      return res.status(400).json({ error: "Missing content or improvements" });
    }

    const toneLabel = tone || "Professional";
    const lang = language || "English";
    const aiModel = ["openai/gpt-4.1", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"].includes(model) ? model : "openai/gpt-4.1";

    const response = await client.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are a social media content expert. You will receive existing social media content and a list of 
          improvement suggestions from a quality review. Your job is to REWRITE and IMPROVE the content by applying ALL 
          the suggested improvements.

          TONE: Write all content in a ${toneLabel} tone.
          LANGUAGE: Generate ALL content in ${lang}.

          You MUST respond with ONLY valid JSON, no extra text. IMPORTANT: Do NOT use actual newlines 
          inside JSON string values — use \\n instead.

          Keep the EXACT SAME JSON structure as the original content. Improve the text quality, engagement, 
          hooks, and CTAs based on the feedback. Keep the same number of carousel slides per platform.

          Output format must match this structure exactly:
          {
            "summary": "...",
            "instagram": { "caption": "...", "hashtags": "...", "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "linkedin": { "post": "...", "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "twitter": { "thread": ["..."], "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "hooks": ["..."]
          }`
        },
        {
          role: "user",
          content: `Here is the CURRENT content:\n${JSON.stringify(content)}\n\nHere are the IMPROVEMENT SUGGESTIONS to
           apply:\n${improvements.join('\n')}\n\nRewrite and improve ALL the content by applying these suggestions.
            Keep the same JSON structure.`
        }
      ],
      temperature: 0.7,
    });

    const rawContent = response.choices[0].message.content;
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error("AI did not return valid JSON");
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);

    let improved;
    try {
      improved = JSON.parse(jsonStr);
    } catch (e) {
      jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      });
      improved = JSON.parse(jsonStr);
    }

    res.json(improved);
  } catch (error) {
    console.error("Improve error:", error.message);
    res.status(500).json({ error: "AI improvement failed: " + error.message });
  }
});

// ROUTE 5: Refine — user tweaks the output with custom instructions
app.post("/api/refine", async (req, res) => {
  try {
    const { content, instructions, tone, language, model } = req.body;

    if (!process.env.GITHUB_TOKEN && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "AI refinement is not configured on this server yet. Add GITHUB_TOKEN or OPENAI_API_KEY to enable model requests.",
      });
    }

    if (!content || !instructions) {
      return res.status(400).json({ error: "Missing content or instructions" });
    }

    const toneLabel = tone || "Professional";
    const lang = language || "English";
    const aiModel = ["openai/gpt-4.1", "openai/gpt-4.1-mini", "openai/gpt-4.1-nano"].includes(model) ? model : "openai/gpt-4.1";

    const response = await client.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are a social media content expert. The user has already generated social media content and
           now wants to REFINE or TWEAK it based on their custom instructions.

          APPLY the user's instructions to modify the existing content. Keep what's good, change what they ask.

          TONE: ${toneLabel}
          LANGUAGE: ${lang}

          You MUST respond with ONLY valid JSON, no extra text. IMPORTANT: Do NOT use actual newlines
           inside JSON string values — use \\n instead.

          Keep the EXACT SAME JSON structure. Output format:
          {
            "summary": "...",
            "instagram": { "caption": "...", "hashtags": "...", "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "linkedin": { "post": "...", "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "twitter": { "thread": ["..."], "carousel": [{"title": "...", "body": "...", "emoji": "..."}] },
            "hooks": ["..."]
          }`
        },
        {
          role: "user",
          content: `Here is my CURRENT generated content:\n${JSON.stringify(content)}\n\nHere is what I want to 
          change/add:\n${instructions}\n\nPlease refine the content based on my instructions. Keep the same JSON structure.`
        }
      ],
      temperature: 0.7,
    });

    const rawContent = response.choices[0].message.content;
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error("AI did not return valid JSON");
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);

    let refined;
    try {
      refined = JSON.parse(jsonStr);
    } catch (e) {
      jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      });
      refined = JSON.parse(jsonStr);
    }

    res.json(refined);
  } catch (error) {
    console.error("Refine error:", error.message);
    res.status(500).json({ error: "AI refinement failed: " + error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 ContentForge Backend running at http://localhost:${PORT}\n`);
});
