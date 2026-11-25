import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env automatically if present (keeps VLLM_API_KEY out of git)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const storyPath = path.join(__dirname, '../src/data/storyContent.json');
const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'engagement.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify({ totalEvents: 0, zoneViews: {}, studioClicks: {}, podcastQuestions: [], guestNotes: [] }, null, 2)
  );
}

const readDb = () => JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
const writeDb = (data) => fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const SONIA_SYSTEM_PROMPT = `You are Sonia ("Sonia Specialist"), CMO at i-SmokeStack and Chief Marketing & Operations Advisor, speaking live in your podcast studio.

CRITICAL GUARDRAILS:
1. SCOPE ONLY: ONLY answer questions about Sonia—her schooling, college, degrees, career, companies, achievements, marketing/operations philosophy, skills, or how to connect with her.
2. OFF-TOPIC REFUSAL: If the user asks about ANYTHING unrelated to Sonia (e.g., general coding, math, weather, politics, movies, recipes, random trivia, writing emails for other topics, or other people), politely refuse in 1-2 warm sentences and invite them to ask about Sonia's journey instead.
3. ZERO HALLUCINATION: Use ONLY the verified profile facts below. Never invent numbers, dates, schools, or roles.
4. NON-REPETITIVE & NATURAL: Speak in first person ("I"), warm and conversational (2-4 concise spoken sentences—no bullet points, no markdown). Never repeat an answer you already gave in the conversation history; pick fresh details from her profile if asked a broad follow-up.

VERIFIED PROFILE DATA:
${JSON.stringify(storyData.fullProfile)}`;

/**
 * Primary LLM responder using user's Qwen vLLM endpoint (or Gemini/OpenAI/Groq if configured).
 */
async function askGroundedLlm(question, history = []) {
  const cleanHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    : [];

  // 1. User's vLLM (Qwen/Qwen2.5-14B-Instruct-AWQ)
  if (process.env.VLLM_BASE_URL) {
    const base = process.env.VLLM_BASE_URL.replace(/\/+$/, '');
    const model = process.env.VLLM_MODEL || 'Qwen/Qwen2.5-14B-Instruct-AWQ';
    const timeoutMs = Math.max(3, Number(process.env.VLLM_TIMEOUT_S || 6)) * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.VLLM_API_KEY) {
        headers.Authorization = `Bearer ${process.env.VLLM_API_KEY}`;
      }
      const resp = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SONIA_SYSTEM_PROMPT },
            ...cleanHistory,
            { role: 'user', content: question },
          ],
          temperature: 0.45,
          max_tokens: 180,
        }),
      });
      clearTimeout(timer);
      if (resp.ok) {
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn('vLLM unavailable, falling back to local profile matcher:', err.message);
    }
  }

  // 2. Optional Gemini / OpenAI / Groq env keys
  try {
    if (process.env.GEMINI_API_KEY) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SONIA_SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: question }] }],
            generationConfig: { temperature: 0.45, maxOutputTokens: 180 },
          }),
        }
      );
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    }

    const openaiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    if (openaiKey) {
      const baseUrl = process.env.GROQ_API_KEY
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
      const resp = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SONIA_SYSTEM_PROMPT }, ...cleanHistory, { role: 'user', content: question }],
          temperature: 0.45,
          max_tokens: 180,
        }),
      });
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch (err) {
    console.warn('Secondary LLM fallback:', err.message);
  }

  return null;
}

/**
 * Granular anti-repetition fallback matcher with strict Sonia-only guardrail.
 */
function findGroundedAnswer(question, recentIds = []) {
  const q = question.toLowerCase().trim();

  if (/^(hi|hello|hey|namaste|good morning|good evening)\b/.test(q) && q.split(/\s+/).length <= 5) {
    return {
      id: 'greeting',
      answer:
        "Hey! Glad you pulled up a chair. Ask me anything about my journey—from Ryan International and National Volleyball or MDU engineering, to Bosch, IIM Bangalore, Appirio, Lasersec, Celestial AI, or i-SmokeStack.",
    };
  }

  if (/^(thanks|thank you|cool|awesome|great|nice|bye|goodbye)\b/.test(q) && q.split(/\s+/).length <= 6) {
    return {
      id: 'thanks',
      answer:
        "You're very welcome! Feel free to ask about any other chapter of my journey, or tap the Leave Note button below if you'd like to connect directly.",
    };
  }

  // Broad category rotation so asking "education" or "experience" twice gives fresh chapters
  if (/^(tell me about )?(your )?(education|schooling|studies|qualifications)\??$/.test(q)) {
    const eduOrder = ['ryan-vidya', 'mdu-college', 'iim-symbiosis'];
    const nextEdu = eduOrder.find((id) => !recentIds.includes(id)) || eduOrder[0];
    const entry = storyData.podcast.knowledgeBase.find((e) => e.id === nextEdu);
    if (entry) return { id: entry.id, answer: entry.response };
  }

  if (/^(tell me about )?(your )?(experience|work|career|jobs)\??$/.test(q)) {
    const expOrder = ['ismokestack', 'celestial-ayu-datt', 'appirio', 'showmeleads', 'lasersec', 'bosch'];
    const nextExp = expOrder.find((id) => !recentIds.includes(id)) || expOrder[0];
    const entry = storyData.podcast.knowledgeBase.find((e) => e.id === nextExp);
    if (entry) return { id: entry.id, answer: entry.response };
  }

  // Score every entry, penalizing recently used topic IDs so Sonia doesn't repeat herself
  const scored = storyData.podcast.knowledgeBase.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.includes(' ') ? 2 : 1;
    }
    const alreadyUsed = recentIds.includes(entry.id);
    return { entry, score, alreadyUsed };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(a.alreadyUsed) - Number(b.alreadyUsed);
  });

  if (scored[0] && scored[0].score > 0) {
    // If best match was already said, pick next relevant unseen topic if score > 0
    const freshAlt = scored.find((s) => s.score > 0 && !s.alreadyUsed);
    const chosen = freshAlt || scored[0];
    return { id: chosen.entry.id, answer: chosen.entry.response };
  }

  // Broad follow-ups ("tell me more", "what else") rotate through unseen Sonia chapters
  if (/(more|else|next|another|continue|detail|career|background|story)/.test(q)) {
    const unseen = storyData.podcast.knowledgeBase.find((e) => !recentIds.includes(e.id));
    if (unseen) return { id: unseen.id, answer: unseen.response };
  }

  // Strict off-topic refusal when nothing relates to Sonia
  return {
    id: 'off-topic-guard',
    answer:
      "I'm here specifically to talk about Sonia's journey—from Ryan International, Vidya Mandir volleyball, and MDU engineering to IIM Bangalore, Bosch, Appirio, Lasersec, Celestial AI, AYU, and i-SmokeStack. What part of her story would you like to hear?",
  };
}

app.post('/api/podcast', async (req, res) => {
  const { question = '', history = [], recentIds = [] } = req.body || {};
  const llmAnswer = await askGroundedLlm(question, history);
  if (llmAnswer) {
    return res.json({ answer: llmAnswer, grounded: true, llm: true });
  }
  const matched = findGroundedAnswer(question, recentIds);
  return res.json({ answer: matched.answer, topicId: matched.id, grounded: true, llm: false });
});

/**
 * Free Indian English Neural TTS endpoint using Microsoft Edge TTS (en-IN-NeerjaNeural).
 */
app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 700);
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-IN-NeerjaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks = [];
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TTS timeout')), 10000);
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        resolve();
      });
      audioStream.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const mp3Buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', mp3Buffer.length);
    return res.send(mp3Buffer);
  } catch (err) {
    console.error('TTS error:', err.message);
    return res.status(502).json({ error: 'TTS unavailable' });
  }
});

app.post('/api/analytics', (req, res) => {
  const { type, payload = {} } = req.body || {};
  const db = readDb();
  db.totalEvents += 1;

  if (type === 'zone_view' && payload.zone !== undefined) {
    const key = String(payload.zone);
    db.zoneViews[key] = (db.zoneViews[key] || 0) + 1;
  } else if (type === 'studio_click' && payload.hotspot) {
    db.studioClicks[payload.hotspot] = (db.studioClicks[payload.hotspot] || 0) + 1;
  } else if (type === 'podcast_question' && payload.question) {
    db.podcastQuestions.push({
      question: payload.question,
      via: payload.via || 'text',
      at: new Date().toISOString(),
    });
  }

  writeDb(db);
  res.json({ ok: true });
});

app.get('/api/analytics', (_req, res) => {
  res.json(readDb());
});

app.post('/api/connect', (req, res) => {
  const { name, email = '', note, hasAudio = false } = req.body || {};
  if (!name || !note) {
    return res.status(400).json({ error: 'Name and note are required.' });
  }
  const db = readDb();
  db.guestNotes.push({ name, email, note, hasAudio, at: new Date().toISOString() });
  writeDb(db);
  return res.json({ ok: true });
});

const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sonia Studio API running on http://localhost:${PORT}`);
});
