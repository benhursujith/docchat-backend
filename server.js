const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*', methods: ['POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10mb' })); // for /ask payload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15 MB max

let documentText = '';

app.post('/summarize', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const text = await extractText(file);
    documentText = text.slice(0, 4000); // keep it manageable for HuggingFace
    const summary = await callHuggingFace(`Summarize this:

${documentText}`);

    return res.json({ summary });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(500).json({ error: 'Summarization failed.' });
  }
});

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    console.log('Received question:', question);
    if (!question || !documentText) {
      console.warn('Missing data:', { question, doc: !!documentText });
      return res.status(400).json({ error: 'Missing question or document context' });
    }

    const prompt = `Based on this document:

${documentText}

Answer the following question:
${question}`;
    const answer = await callHuggingFace(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err.message);
    res.status(500).json({ error: 'Failed to answer question.' });
  }
});

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

  const result = await response.json();
  if (Array.isArray(result)) return result[0]?.generated_text || 'No answer.';
  if (result?.generated_text) return result.generated_text;
  return typeof result === 'object' ? JSON.stringify(result) : 'Unexpected response';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
