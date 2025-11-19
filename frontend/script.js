// ===== Frontend JavaScript - Browser Only =====
const form = document.getElementById('resumeForm');
const fileInput = document.getElementById('resumeFile');
const roundSelect = document.getElementById('roundType');
const fileNameDisplay = document.getElementById('fileName');
const loadingSection = document.getElementById('loadingSection');
const questionsSection = document.getElementById('questionsSection');
const questionsList = document.getElementById('questionsList');
const toast = document.getElementById('toast');
const webcamContainer = document.getElementById('webcamContainer');
const webcamVideo = document.getElementById('webcam');
const themeToggleBtn = document.getElementById('themeToggleBtn');

let currentQuestionIndex = 0;
let questionArray = [];
let webcamStream = null;
let mediaRecorder;
let recordedChunks = [];
let currentUtterance = null;

// File input change handler
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (file) {
    fileNameDisplay.textContent = file.name;
    console.log('✅ File selected:', file.name, 'Size:', file.size, 'bytes');
  } else {
    fileNameDisplay.textContent = '';
  }
};

// Form submission handler
form.onsubmit = async function (e) {
  e.preventDefault();
  
  // Validate file selection
  if (!fileInput.files || !fileInput.files[0]) {
    showToast('❌ Please select a resume file first!', true);
    return;
  }

  const file = fileInput.files[0];
  
  // // Validate file type
  // if (!file.name.endsWith('.txt')) {
  //   showToast('❌ Please upload a .pdf file only!', true);
  //   return;
  // }

  const ext = file.name.split('.').pop().toLowerCase();
if (ext !== 'txt' && ext !== 'pdf') {
    showToast('❌ Only .txt or .pdf files allowed!', true);
    return;
}


  console.log('📤 Submitting file:', file.name);
  
  showLoader(true);
  questionsSection.style.display = 'none';
  questionsList.innerHTML = '';
  currentQuestionIndex = 0;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('round_type', roundSelect.value);

  try {
    console.log('🔄 Sending request to backend...');
    const res = await fetch('https://ai-interview-assistant-02q1.onrender.com/generate_questions', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Server error:', errorText);
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    console.log('✅ Response received:', data);
    
    questionArray = data.questions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^\d+[\.\)]\s/));

    if (questionArray.length > 0) {
      showNextQuestion();
      showToast('✅ Questions generated successfully!');
      questionsSection.style.display = 'block';
      questionsSection.style.opacity = '1';
      questionsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast('⚠️ No questions generated. Please try again.', true);
    }

  } catch (err) {
    console.error('❌ Error:', err);
    showToast('❌ Error: ' + err.message, true);
  } finally {
    showLoader(false);
  }
};

function showNextQuestion() {
  if (currentQuestionIndex >= questionArray.length) {
    questionsList.innerHTML = "<li><strong>✅ Interview complete!</strong></li>";
    stopWebcam();
    return;
  }

  questionsList.innerHTML = '';
  const cleanQuestion = questionArray[currentQuestionIndex].replace(/\*\*/g, '');
  const li = document.createElement('li');
  li.innerHTML = `
    <div><strong>${cleanQuestion}</strong></div>
    <textarea placeholder="Type or speak your answer..." rows="3"></textarea>
    <button class="speakBtn">🎤 Speak</button>
    <button class="retryVoice">🔁 Retry</button>
    <button class="evalBtn" data-index="${currentQuestionIndex}">Evaluate</button>
    <div class="evalResult" style="margin-top:10px;"></div>
  `;
  questionsList.appendChild(li);
  if (!webcamStream) startWebcam();
}

function showLoader(show) {
  loadingSection.style.display = show ? 'block' : 'none';
  loadingSection.style.opacity = show ? '1' : '0';
}

questionsList.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  
  const textarea = li.querySelector('textarea');
  const questionText = li.querySelector('strong').textContent;
  const resultDiv = li.querySelector('.evalResult');

  if (e.target.classList.contains('speakBtn')) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("❌ Speech Recognition not supported. Use Google Chrome.", true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => showToast("🎤 Listening...");
    recognition.onresult = (event) => {
      textarea.value = event.results[0][0].transcript;
      showToast("✅ Speech captured!");
    };
    recognition.onerror = (event) => showToast(`❌ ${event.error}`, true);
    recognition.start();
  }

  if (e.target.classList.contains('retryVoice')) {
    textarea.value = '';
    if (!webcamStream) startWebcam();
  }

  if (e.target.classList.contains('evalBtn')) {
    const answerText = textarea.value.trim();
    if (!answerText) {
      resultDiv.innerHTML = "<span style='color:red;'>⚠️ Please enter or speak an answer first.</span>";
      return;
    }

    e.target.textContent = 'Evaluating...';
    e.target.disabled = true;
    resultDiv.innerHTML = '';

    try {
      const feedbackRes = await fetch('https://ai-interview-assistant-02q1.onrender.com/generate_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, candidate_answer: answerText })
      });

      if (!feedbackRes.ok) {
        throw new Error('Failed to get feedback');
      }

      const feedbackData = await feedbackRes.json();
      const feedbackText = feedbackData.feedback;
      const score = feedbackData.score || 'N/A';

      resultDiv.innerHTML = `
        <div style="margin-top:8px;">
          <strong style="font-size: 18px; color: #2c3e50;">📝 Feedback:</strong>
          <div style="font-size: 16px; font-weight: bold; color: #34495e; margin: 10px 0;">
            🎯 Score: ${score}/10
          </div>
          <div class="feedback-text">${formatFeedback(feedbackText)}</div>
          <button class="playFeedbackBtn">🔊 Play Feedback</button>
          <button class="stopFeedbackBtn">⏹️ Stop</button>
          <button class="nextQuestionBtn">➡️ Next Question</button>
        </div>
      `;

      stopWebcam();

    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = "<span style='color:red;'>❌ Error evaluating answer.</span>";
    } finally {
      e.target.textContent = 'Evaluate';
      e.target.disabled = false;
    }
  }

  if (e.target.classList.contains('playFeedbackBtn')) {
    const feedbackText = li.querySelector('.feedback-text').textContent;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(feedbackText);
    currentUtterance.lang = 'en-US';
    speechSynthesis.speak(currentUtterance);
  }

  if (e.target.classList.contains('stopFeedbackBtn')) {
    speechSynthesis.cancel();
  }

  if (e.target.classList.contains('nextQuestionBtn')) {
    currentQuestionIndex++;
    showNextQuestion();
  }
});

function formatFeedback(text) {
  return `<div style="font-family:'Segoe UI', sans-serif; font-size:15px; color:#222; line-height:1.6;">${
    text.replace(/\*\*Score.*?\*\*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2c3e50;">$1</strong>')
        .replace(/\n/g, '<br>')
  }</div>`;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? '#e74c3c' : '#2ecc71';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

async function startWebcam() {
  try {
    webcamContainer.style.display = 'block';
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    webcamVideo.srcObject = webcamStream;
    startRecording();
  } catch (err) {
    console.error("Webcam error:", err);
    showToast("⚠️ Camera access denied or unavailable", true);
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
  stopRecording();
  webcamContainer.style.display = 'none';
}

function startRecording() {
  if (!webcamStream) return;

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(webcamStream, { mimeType: 'video/webm' });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const resultDiv = questionsList.querySelector('.evalResult');
    if (!resultDiv) return;

    const showRecordingBtn = document.createElement('button');
    showRecordingBtn.textContent = '🎬 Want to see your recording?';
    showRecordingBtn.className = 'playRecordingBtn';
    showRecordingBtn.style.marginTop = '12px';
    showRecordingBtn.style.background = '#8e44ad';
    showRecordingBtn.style.color = 'white';

    showRecordingBtn.onclick = () => {
      const playback = document.createElement('video');
      playback.controls = true;
      playback.src = url;
      playback.style = `
        width: 320px;
        height: 240px;
        margin-top: 10px;
        border-radius: 8px;
        border: 2px solid #ccc;
      `;
      resultDiv.appendChild(playback);
      showRecordingBtn.disabled = true;
      showRecordingBtn.textContent = '🎥 Recording shown above';
    };

    resultDiv.appendChild(showRecordingBtn);
  };

  mediaRecorder.start();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

function applyTheme(theme) {
  document.body.className = theme;
  themeToggleBtn.textContent = theme === 'dark-mode' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.body.className;
  const newTheme = currentTheme === 'dark-mode' ? 'light-mode' : 'dark-mode';
  applyTheme(newTheme);
});

// Initialize with light mode
applyTheme('light-mode');
