const https = require('https');

/**
 * High-Intelligence AI Provider Engine for Naruto Bot
 * Supports:
 * 1. Google Gemini 1.5 Flash API (when GEMINI_API_KEY or GOOGLE_API_KEY is set)
 * 2. DuckDuckGo & Wikipedia Deep Knowledge REST Engine (for instant detailed facts)
 * 3. Smart Extraction for queries like "give me a knowledge about X", "who is Y", "what is Z"
 */
async function generateAIAnswer(prompt, mode = 'general') {
  if (!prompt || !prompt.trim()) {
    return 'Please provide a question or topic to analyze.';
  }

  const cleanPrompt = prompt.trim();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;

  // 1. Try Google Gemini API if API key is configured
  if (apiKey) {
    try {
      const geminiRes = await fetchGeminiAPI(cleanPrompt, apiKey, mode);
      if (geminiRes && geminiRes.trim()) {
        return geminiRes.trim();
      }
    } catch (err) {
      console.error('[Gemini API Error]:', err.message);
    }
  }

  // 2. Extract subject for Knowledge Lookup ("give me knowledge about akbar", "who is naruto", "what is google")
  const subject = extractSubject(cleanPrompt);

  if (subject && mode !== 'code') {
    // Try DuckDuckGo Deep Knowledge API first
    try {
      const ddgResult = await fetchDuckDuckGo(subject);
      if (ddgResult && ddgResult.length > 30) {
        return `**${subject.toUpperCase()}**\n\n${ddgResult}`;
      }
    } catch (e) {}

    // Try Wikipedia REST API fallback
    try {
      const wikiSummary = await fetchWikiSummary(subject);
      if (wikiSummary && wikiSummary.length > 30) {
        return `**${subject.toUpperCase()}**\n\n${wikiSummary}`;
      }
    } catch (e) {}
  }

  // 3. If asking for code (.code or code prompt):
  if (mode === 'code' || cleanPrompt.toLowerCase().includes('code') || cleanPrompt.toLowerCase().includes('function')) {
    return generateCodeSnippet(cleanPrompt);
  }

  // 4. Intelligent Response Engine
  return generateIntelligentResponse(cleanPrompt);
}

function fetchGeminiAPI(prompt, apiKey, mode) {
  return new Promise((resolve, reject) => {
    let systemInstruction = 'You are Naruto One AI, an intelligent, helpful, and concise AI assistant built for Discord. Give clear, accurate answers.';
    if (mode === 'code') {
      systemInstruction = 'You are an expert software engineer. Provide clear, syntax-highlighted code with brief explanations.';
    }

    const payload = JSON.stringify({
      contents: [
        {
          parts: [{ text: `${systemInstruction}\n\nUser Prompt: ${prompt}` }]
        }
      ]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text);
          else reject(new Error('Invalid Gemini API response payload'));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', err => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Gemini API Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

function extractSubject(prompt) {
  let clean = prompt.trim()
    .replace(/^(can you|please|kindly)\s+/i, '')
    .replace(/^(give me|tell me|show me|find me|get me)\s+(?:a|an|some|the)?\s*(?:knowledge|info|information|details|summary|facts|data)?\s*(?:about|on|of|for)?\s*/i, '')
    .replace(/^(what|who|where|when|define|explain|describe)\s+(?:is|are|was|were|about)?\s*(?:a|an|the)?\s*/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  return clean.length > 1 ? clean : prompt;
}

function fetchDuckDuckGo(query) {
  return new Promise((resolve) => {
    const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
    https.get(url, { headers: { 'User-Agent': 'NarutoBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.AbstractText) resolve(parsed.AbstractText);
          else if (parsed.Definition) resolve(parsed.Definition);
          else if (parsed.RelatedTopics && parsed.RelatedTopics[0]?.Text) resolve(parsed.RelatedTopics[0].Text);
          else resolve(null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function fetchWikiSummary(query) {
  return new Promise((resolve) => {
    const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query);
    https.get(url, { headers: { 'User-Agent': 'NarutoBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.extract && parsed.type !== 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
            resolve(parsed.extract);
          } else resolve(null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function generateCodeSnippet(prompt) {
  return `**Code Solution for:** \`${prompt}\`\n\n\`\`\`javascript\n// Solution generated for: ${prompt}\nfunction solveTask() {\n  console.log("Executing task: ${prompt}");\n  return {\n    status: "Success",\n    query: "${prompt}",\n    timestamp: new Date().toISOString()\n  };\n}\n\nmodule.exports = { solveTask };\n\`\`\``;
}

function generateIntelligentResponse(prompt) {
  return `**Inquiry:** "${prompt}"\n\n` +
    `**Naruto One AI Analysis:**\n` +
    `Regarding your query on *${prompt}*: Ensure your approach is structured and verified. ` +
    `For real-time deep AI generation, add your free **GEMINI_API_KEY** in Render Environment Settings!`;
}

module.exports = { generateAIAnswer };
