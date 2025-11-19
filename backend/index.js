const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const natural = require('natural');
const Sentiment = require('sentiment');

// Load .env with explicit path
const envPath = path.join(__dirname, '.env');
console.log('📁 Looking for .env at:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env:', result.error.message);
} else {
  console.log('✅ .env file loaded successfully');
}

// Debug: Check if API key is loaded
console.log('🔑 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log('🔑 Key length:', process.env.GEMINI_API_KEY.length, 'characters');
  console.log('🔑 Key preview:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
}

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const sentimentAnalyzer = new Sentiment();
const tokenizer = new natural.WordTokenizer();

// === Gemini API Configuration ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash'; // Using stable model
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Helper function to call Gemini API
async function callGemini(prompt) {
  try {
    const response = await axios.post(GEMINI_ENDPOINT, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error('Failed to get response from Gemini API');
  }
}

// === Health check ===
app.get('/', (req, res) => {
  res.send('🎉 AI Interview Backend is running with Gemini!');
});

// === POST /generate_questions ===
app.post('/generate_questions', upload.single('file'), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in .env file');
    }

    const resumeText = req.file.buffer.toString('utf-8');
    const roundType = req.body.round_type;

    const prompt = `You are an expert interviewer. Based on the resume below, generate 4 ${roundType} interview questions. Number them clearly (1. 2. 3. 4.).

Resume:
${resumeText}

${roundType} Round Questions:`;

    const content = await callGemini(prompt);
    res.json({ questions: content });

  } catch (err) {
    console.error('Error in /generate_questions:', err);
    res.status(500).json({ error: err.message || "Failed to generate questions." });
  }
});

// === POST /evaluate_answer ===
app.post('/evaluate_answer', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in .env file');
    }

    const { question, candidate_answer } = req.body;

    const feedbackPrompt = `You are a senior technical interviewer.

Evaluate the candidate's response to the following interview question and provide detailed, constructive feedback.

Question:
${question}

Answer:
${candidate_answer}

Give your response in the following structured format:

- Score (out of 10):
- Strengths:
- Weaknesses:
- Suggestions for improvement:`;

    const feedback = await callGemini(feedbackPrompt);

    // === Evaluate similarity score ===
    const candidateTokens = tokenizer.tokenize(candidate_answer.toLowerCase());
    const questionTokens = tokenizer.tokenize(question.toLowerCase());

    const cosineSim = natural.JaroWinklerDistance(candidateTokens.join(' '), questionTokens.join(' '));
    const sentimentResult = sentimentAnalyzer.analyze(candidate_answer);

    res.json({
      feedback,
      scores: {
        keyword_score: Math.round(cosineSim * 100),
        sentiment_score: sentimentResult.comparative.toFixed(2)
      }
    });

  } catch (err) {
    console.error('Error in /evaluate_answer:', err);
    res.status(500).json({ error: err.message || "Failed to evaluate answer." });
  }
});

// === POST /generate_feedback ===
app.post('/generate_feedback', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in .env file');
    }

    const { question, candidate_answer } = req.body;

    const prompt = `You are a senior technical interviewer.

Evaluate the candidate's response to the following interview question.

Question:
${question}

Answer:
${candidate_answer}

Give your feedback in the following format:

**Score (out of 10):**
[Provide a score]

**Strengths:**
[List the strengths of the answer]

**Areas to Improve:**
[List areas that need improvement]

**Suggestions for Improvement:**
[Provide specific suggestions]`;

    const content = await callGemini(prompt);
    
    // Extract score if present
    const scoreMatch = content.match(/Score.*?(\d+)\/10/i);
    const score = scoreMatch ? scoreMatch[1] : 'N/A';

    res.json({ 
      feedback: content,
      score: score
    });

  } catch (err) {
    console.error('Error in /generate_feedback:', err);
    res.status(500).json({ error: err.message || "Failed to generate feedback." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📡 Using Gemini API`);
  if (!GEMINI_API_KEY) {
    console.error('⚠️  WARNING: GEMINI_API_KEY not found in environment variables!');
  }
});