// Elements
const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');
const widget = document.getElementById('chat-widget');
const toggleBtn = document.getElementById('chat-toggle');
const themeToggle = document.getElementById('theme-toggle');
const showBtn = document.getElementById('chat-show');

const workerUrl = "https://gpt-chat-widget.mukechiwarichard.workers.dev";

// Load chat history
let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
history.forEach(msg => appendMessage(msg.who, msg.text));

// Helper: append message
function appendMessage(who, text) {
  const div = document.createElement('div');
  div.classList.add('chat-message');
  div.innerHTML = `<strong>${who}:</strong> ${text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  // Save to history
  history.push({ who, text });
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

// Show/hide widget
function hideWidget() {
  widget.classList.add('hidden');
  showBtn.style.display = "block";
}

function showWidget() {
  widget.classList.remove('hidden');
  showBtn.style.display = "none";
}

// Toggle button in header
toggleBtn.addEventListener('click', () => {
  widget.classList.toggle('hidden');
  showBtn.style.display = widget.classList.contains('hidden') ? "block" : "none";
});

// Clicking outside closes widget
document.addEventListener('click', (e) => {
  if (!widget.contains(e.target) && !widget.classList.contains('hidden')) {
    hideWidget();
  }
});

// Prevent widget clicks from closing itself
widget.addEventListener('click', (e) => e.stopPropagation());

// Reopen button
showBtn.addEventListener('click', showWidget);

// Dark/light mode
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// Typing indicator
function botTyping() {
  const div = document.createElement('div');
  div.classList.add('chat-message');
  div.innerHTML = `<strong>Bot:</strong> <em>typing...</em>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

// Handle user input
input.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || input.value.trim() === "") return;

  const msg = input.value.trim();
  appendMessage('You', msg);
  input.value = "";

  const typingDiv = botTyping();

  try {
    const res = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    typingDiv.innerHTML = `<strong>Bot:</strong> ${data.reply}`;
  } catch (err) {
    typingDiv.innerHTML = `<strong>Bot:</strong> Error, try again.`;
    console.error(err);
  }
});
