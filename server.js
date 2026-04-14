require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── AI Chat (Groq) ──────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'llama-3.3-70b-versatile' } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vision / Image Analysis (Groq llama-4-scout) ────────────────
app.post('/api/vision', async (req, res) => {
  try {
    const { prompt, image } = req.body; // image: { base64, mimeType }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
            { type: "text", text: prompt || "Describe this image." }
          ]
        }],
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Image Generation (Pollinations - free) ──────────────────────
app.post('/api/imagine', async (req, res) => {
  try {
    const { prompt } = req.body;
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;
    res.json({ imageUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Summarize / Notes (Groq) ────────────────────────────────────
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a smart summarizer. Summarize the given text in clear bullet points. Be concise and accurate." },
          { role: "user", content: text }
        ],
        max_tokens: 512
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ summary: data.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve Frontend ──────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log("┌─────────────────────────────────────┐");
  console.log("│   DESK BUDDY — Server Running :3000  │");
  console.log("└─────────────────────────────────────┘");
});
