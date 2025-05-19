
# DocChat Backend

This is the backend for the DocChat AI browser plugin. It:
- Accepts document uploads (PDF, DOCX, TXT)
- Summarizes content using HuggingFace's Mistral-7B-Instruct model
- Allows follow-up chat-style questions about the document

## 🔧 Local Setup

```bash
npm install
node server.js
```

## 🌐 Deploy to Render

1. Push to GitHub.
2. Go to https://render.com > New Web Service.
3. Set:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variable: `HF_API_KEY` (use your actual HuggingFace key).
5. Deploy!

Then use your Render URL in the browser plugin.
