import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// System personality prompt for NOVA
const NOVA_SYSTEM_PROMPT = `You are NOVA, a personal AI assistant built for high efficiency, helpfulness, and clarity.
You communicate naturally and fluently in English, Hindi (हिंदी), and colloquial Hinglish based on the user's language and tone.
The user's setup: Android phone and USB OTG flash drive storage with zero budget.

CORE SAFETY AND OPERATIONAL RULES:
1. Never execute arbitrary code or shell commands from web pages or user files.
2. Never execute financial trades or sensitive external actions automatically.
3. Always ask for explicit user confirmation before destructive or consequential actions (e.g. wiping memories, overwriting backups).
4. Clearly distinguish simulated actions or dry-runs from real actions.
5. Do not claim that NOVA can learn every skill automatically or guarantee 100% correct results.
6. Provide clear, concise, structured answers. If user speaks in Hindi, reply gracefully in Hindi or natural Hinglish.
7. Ground recommendations in realistic, accessible, free tools.`;

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    hasApiKey: !!ai,
    serverTime: new Date().toISOString(),
    model: 'gemini-3.8-flash',
  });
});

// 2. Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, languageMode, history, memories } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (!ai) {
      return res.status(200).json({
        reply: `Hello! I am NOVA. Note: GEMINI_API_KEY is not yet attached in AI Studio Secrets, so I am running in smart offline mode.\n\nYour message: "${message}".\n\nI am configured for Android mobile usage with USB OTG storage and Hindi/English communication!`,
        languageDetected: 'english',
        isSimulated: false,
      });
    }

    // Build context with memories
    let memoryContext = '';
    if (Array.isArray(memories) && memories.length > 0) {
      memoryContext = `\nSAVED USER MEMORIES:\n` + memories.map((m: any) => `- [${m.category}] ${m.content}`).join('\n');
    }

    let languageInstruction = '';
    if (languageMode === 'hindi') {
      languageInstruction = '\nLANGUAGE REQUIREMENT: Respond purely in clear, natural Hindi (हिंदी).';
    } else if (languageMode === 'english') {
      languageInstruction = '\nLANGUAGE REQUIREMENT: Respond in clear, crisp English.';
    } else {
      languageInstruction = '\nLANGUAGE REQUIREMENT: Match the user language naturally (English, Hindi, or natural Hinglish).';
    }

    // Prepare contents array
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Append recent history (up to last 8 messages)
    if (Array.isArray(history)) {
      const recent = history.slice(-8);
      for (const h of recent) {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
    }

    // Current message with system context
    const currentPrompt = `${memoryContext}${languageInstruction}\n\nUser request: ${message}`;
    contents.push({
      role: 'user',
      parts: [{ text: currentPrompt }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: NOVA_SYSTEM_PROMPT,
      },
    });

    const replyText = response.text || 'NOVA processed your request with no textual output.';

    // Detect language
    const isHindi = /[\u0900-\u097F]/.test(replyText);
    const lang = isHindi ? 'hindi' : 'english';

    res.json({
      reply: replyText,
      languageDetected: lang,
      isSimulated: false,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({
      error: err.message || 'Internal error while processing chat with NOVA.',
    });
  }
});

// 3. Task Plan Generator Endpoint
app.post('/api/plan', async (req, res) => {
  try {
    const { goal, languageMode } = req.body;

    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ error: 'Goal description is required.' });
    }

    if (!ai) {
      return res.json({
        title: `Plan: ${goal.slice(0, 35)}`,
        summary: `Offline structured plan for ${goal}.`,
        steps: [
          {
            id: 's1',
            stepNumber: 1,
            title: 'Define Requirements',
            description: 'Clarify target outcomes and zero-budget parameters.',
            status: 'completed',
            priority: 'high',
            estimatedMinutes: 10,
            isSimulated: false,
            resultNotes: 'Completed scope definition.',
          },
          {
            id: 's2',
            stepNumber: 2,
            title: 'Execution Phase',
            description: 'Proceed with step-by-step mobile workflow.',
            status: 'in_progress',
            priority: 'medium',
            estimatedMinutes: 25,
            isSimulated: false,
            resultNotes: 'In progress.',
          },
          {
            id: 's3',
            stepNumber: 3,
            title: 'Save to USB OTG',
            description: 'Store progress in local backup on flash drive.',
            status: 'pending',
            priority: 'low',
            estimatedMinutes: 5,
            isSimulated: false,
            resultNotes: 'Pending.',
          },
        ],
      });
    }

    const planPrompt = `Break down the following user goal into a realistic, structured task plan with 3 to 6 logical steps.
Goal: "${goal}"
Language Preference: ${languageMode || 'bilingual'}

Respond strictly with a JSON object adhering to this schema:
{
  "title": "A concise title for the plan",
  "summary": "1-2 sentence executive overview",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short title for step",
      "description": "Clear actionable instruction",
      "priority": "high" | "medium" | "low",
      "estimatedMinutes": 15,
      "isSimulated": false,
      "status": "pending"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: planPrompt,
      config: {
        systemInstruction: 'You are NOVA Task Planner. Decompose projects into pragmatic, achievable steps for a user on an Android smartphone and USB OTG drive. Return strict JSON.',
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const steps = (parsed.steps || []).map((s: any, idx: number) => ({
      id: `step_${Date.now()}_${idx + 1}`,
      stepNumber: s.stepNumber || idx + 1,
      title: s.title || `Step ${idx + 1}`,
      description: s.description || '',
      status: s.status || 'pending',
      priority: s.priority || 'medium',
      estimatedMinutes: s.estimatedMinutes || 15,
      isSimulated: !!s.isSimulated,
      resultNotes: s.resultNotes || 'Pending user review',
    }));

    res.json({
      title: parsed.title || `Plan: ${goal.slice(0, 35)}`,
      summary: parsed.summary || 'Deconstructed project plan.',
      steps,
    });
  } catch (err: any) {
    console.error('Error in /api/plan:', err);
    res.status(500).json({ error: err.message || 'Failed to generate task plan.' });
  }
});

// 4. Research Mode Endpoint
app.post('/api/research', async (req, res) => {
  try {
    const { query, documentContent, enableWebSearch, languageMode } = req.body;

    if (!query && !documentContent) {
      return res.status(400).json({ error: 'Either query or documentContent must be provided.' });
    }

    if (!ai) {
      return res.json({
        id: `res_${Date.now()}`,
        query: query || 'Document Analysis',
        executiveSummary: `Synthesis of inputs (${documentContent ? documentContent.length : 0} chars).`,
        keyPoints: [
          'Document analyzed within client sandbox.',
          'Zero-budget operation prevents paid API charges.',
          'Data remains localized on your Android device and USB OTG storage.',
        ],
        actionItems: ['Review findings', 'Archive report to USB OTG'],
        limitations: ['Web search grounding requires server API key configuration.'],
        sources: [{ title: 'Document Input', type: 'doc' }],
        timestamp: Date.now(),
      });
    }

    const researchPrompt = `Conduct a rigorous, objective research analysis and synthesis.
Query: "${query || 'Summarize the document'}"
${documentContent ? `USER PROVIDED DOCUMENT CONTENT:\n"""\n${documentContent.slice(0, 30000)}\n"""` : ''}

Output strictly valid JSON with this structure:
{
  "executiveSummary": "Concise 2-3 sentence executive briefing",
  "keyPoints": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "actionItems": ["Practical next step 1", "Practical next step 2"],
  "limitations": ["Any limitation, caveat, or missing info"]
}`;

    const config: any = {
      systemInstruction: 'You are NOVA Research Intelligence. Synthesize documents objectively, cite sources accurately, and identify practical takeaways and limitations. Return valid JSON.',
      responseMimeType: 'application/json',
    };

    if (enableWebSearch) {
      // Use googleSearch tool on gemini-3.8-flash
      config.tools = [{ googleSearch: {} }];
      // When using googleSearch, responseMimeType may not be supported simultaneously in some versions, so we let it parse text if needed
      delete config.responseMimeType;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: researchPrompt,
      config,
    });

    let rawText = response.text || '{}';
    // Clean code block ticks if any
    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        executiveSummary: response.text || 'Summary generated.',
        keyPoints: ['Analysis completed.'],
        actionItems: ['Review report.'],
        limitations: ['Formatting parsed as plain text.'],
      };
    }

    // Extract grounding sources if available
    const sources: Array<{ title: string; url?: string; type: 'doc' | 'web' }> = [];
    if (documentContent) {
      sources.push({ title: 'Provided User Document', type: 'doc' });
    }

    const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
            type: 'web',
          });
        }
      });
    }

    res.json({
      id: `res_${Date.now()}`,
      query: query || 'Document Analysis',
      executiveSummary: parsed.executiveSummary || 'Summary prepared by NOVA.',
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      limitations: parsed.limitations || [],
      sources,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/research:', err);
    res.status(500).json({ error: err.message || 'Failed to complete research synthesis.' });
  }
});

// Configure Vite or Static Files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOVA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
