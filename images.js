const express = require('express');
const router = express.Router();
const axios = require('axios');

// Generate image via Pollinations.ai
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`;

    // Verify image is accessible
    await axios.head(imageUrl, { timeout: 10000 });
    res.json({ url: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

module.exports = router;
