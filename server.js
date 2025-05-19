
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

let documentText = '';

app.post('/summarize', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const text = await extractText(file);
  documentText = text.slice(0, 3000);

  const summary = await callHuggingFace(`Summarize this:

${documentText}`);
  res.json({ summary });
});

app.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || !documentText) return res.status(400).json({ error: 'Missing question or document context' });

  const prompt = `Based on this document:

${documentText}

Answer the following question:
${question}`;
  const answer = await callHuggingFace(prompt);
  res.json({ answer });
});

async function callHuggingFace(prompt) {
  const HF_API_KEY = process.env.HF_API_KEY;
  const model = 'mistralai/Mistral-7B-Instruct-v0.1';

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });

  const json = await response.json();
  if (Array.isArray(json)) return json[0]?.generated_text || 'No response.';
  if (json?.generated_text) return json.generated_text;
  return JSON.stringify(json);
}

async function extractText(file) {
  const mime = file.mimetype;
  const buffer = file.buffer;

  if (mime === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mime.includes('wordprocessingml.document')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (mime.startsWith('text/')) {
    return buffer.toString('utf8');
  }

  return 'Unsupported file type.';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
