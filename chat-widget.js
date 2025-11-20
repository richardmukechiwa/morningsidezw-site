const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');
const widget = document.getElementById('chat-widget');
const toggle = document.getElementById('chat-toggle');
const themeToggle = document.getElementById('theme-toggle');
const header = document.getElementById('chat-header');

// Replace with your deployed Worker URL
const workerUrl = "https://gpt-chat-widget.mukechiwarichard.workers.dev";

// Load chat history from localStorage
let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
history.forEach(msg => appendMessage(msg.who, msg.text));

function appendMessage(who, text) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${who}:</strong> ${text}`;
  div.style.marginBottom = "8px";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  // Save to localStorage
  history.push({ who, text });
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

// Minimize / maximize with toggle button
toggle.addEventListener('click', () => {
  widget.classList.toggle('minimized');
});

// Also toggle when clicking the header
header.addEventListener('click', () => {
  widget.classList.toggle('minimized');
});

// Collapse widget when clicking outside
document.addEventListener('click', (e) => {
  if (!widget.contains(e.target) && !widget.classList.contains('minimized')) {
    widget.classList.add('minimized');
  }
});

// Prevent click inside the widget from propagating
widget.addEventListener('click', (e) => e.stopPropagation());

// Dark / light mode
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// Typing indicator helper
function botTyping() {
  const div = document.createElement('div');
  div.innerHTML = `<strong>Bot:</strong> <em>typing...</em>`;
  div.style.marginBottom = "8px";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

// Handle user input
input.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && input.value.trim() !== "") {
    const msg = input.value;
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
  }
});
