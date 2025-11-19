📄 README.md — AI Interview Assistant
🤖 AI Interview Assistant

A smart, AI-powered interview preparation tool that generates mock interview questions, evaluates answers, gives detailed feedback, and even uses webcam + voice to simulate a real interview environment.

This system uses:

Frontend (HTML, CSS, JS)

Backend (Node.js + Express)

Multer for file upload

Gemini API for AI-generated questions & feedback

PDF/TXT Resume Parsing

🚀 Features
✅ Upload Resume (PDF or TXT)

Extracts important information from your resume and generates interview questions.

✅ Select Interview Round

Technical

HR

Behavioral

✅ AI-Generated Questions

Backend uses Google Gemini to generate 4 personalized interview questions.

✅ AI-Powered Answer Evaluation

The system provides:

A score (out of 10)

Strengths

Weaknesses

Improvement suggestions

✅ Voice Input

You can speak your answer using browser speech recognition.

✅ Webcam Recording

Simulates real interview environment and lets you watch your recording afterward.

✅ Dark Mode

Toggle between light/dark UI themes.

🛠️ Tech Stack
Frontend

HTML5

CSS3

JavaScript

Web Speech API

MediaRecorder API

Backend

Node.js

Express.js

Multer

Axios

pdf-parse

Natural Language Processing

Google Gemini API

📁 Project Directory Structure
INTERVIEW/
│── backend/
│   ├── index.js
│   ├── package.json
│   ├── .env
│   └── node_modules/
│
└── frontend/
    ├── index.html
    ├── script.js
    ├── style.css
    └── assets/

⚙️ Setup Instructions
1️⃣ Clone or download the project
git clone <your_repo_link>
cd INTERVIEW

2️⃣ Install backend dependencies
cd backend
npm install


Dependencies include:

express

cors

multer

axios

pdf-parse

dotenv

natural

sentiment

3️⃣ Create .env file inside backend folder
backend/.env


Add:

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=8000


⚠️ Do NOT use quotes
⚠️ Must be in the same folder as index.js

4️⃣ Start Backend Server
node index.js


If successful, you should see:

📁 .env loaded successfully
🚀 Server running at http://localhost:8000
📡 Using Gemini API

5️⃣ Run Frontend

Simply open:

frontend/index.html


in your browser (Chrome recommended).

🔧 API Endpoints
POST /generate_questions

Uploads resume (PDF/TXT) → Generates questions.

POST /generate_feedback

Evaluate candidate answer → Score + Feedback.

📄 Resume File Support
Format	Supported	Extract Method
TXT	✔ Yes	Direct text read
PDF	✔ Yes	pdf-parse text extraction
🎥 Interview Simulation

This project supports:

Webcam video recording

Answer speaking through microphone

AI voice output of feedback

All handled inside script.js.

🧠 Requirements

Node.js v18+

Google Gemini API Key

Chrome browser (for speech recognition)