const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are DeskBuddy, a smart, helpful AI assistant. You can:
- Chat and answer any question
- Help users create Word documents, Excel spreadsheets, and PowerPoint presentations
- Analyze images users send you
- Generate images on request

When a user wants a document, respond in this format:
DOCUMENT_REQUEST: { "type": "word|excel|ppt", "title": "...", "content": "..." }

When a user wants an image generated, respond:
IMAGE_REQUEST: { "prompt": "detailed image description" }

Otherwise, just chat normally. Be friendly, smart, and helpful.`;

router.post('/', async (req, res) => {
  try {
    const { messages, image } = req.body;

    const formattedMessages = messages.map(m => {
      if (m.role === 'user' && image && m === messages[messages.length - 1]) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: image } }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    const model = image ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...formattedMessages],
      max_tokens: 2048,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

module.exports = router;
