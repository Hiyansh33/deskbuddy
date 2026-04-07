require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const chatRoutes = require('./routes/chat');
const docRoutes = require('./routes/documents');
const imageRoutes = require('./routes/images');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/chat', chatRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/images', imageRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DeskBuddy running on port ${PORT}`));
