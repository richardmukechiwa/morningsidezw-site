// DOM elements
const input = document.getElementById("chat-input");
const messages = document.getElementById("chat-messages");
const widget = document.getElementById("chat-widget");
const toggle = document.getElementById("chat-toggle");
const themeToggle = document.getElementById("theme-toggle");
const showBtn = document.getElementById("chat-show");

const workerUrl = "https://gpt-chat-widget.mukechiwarichard.workers.dev";

// Load chat history
let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
history.forEach((msg) => appendMessage(msg.who, msg.text));

// Load widget state
const widgetState = localStorage.getItem("widgetState") || "open";
if (widgetState === "minimized") {
  widget.classList.add("minimized");
  showBtn.style.display = "block";
} else {
  widget.classList.remove("minimized");
  showBtn.style.display = "none";
}

// Append message helper
function appendMessage(who, text) {
  if (!messages) return; // safety check
  const div = document.createElement("div");
  div.innerHTML = `<strong>${who}:</strong> ${text}`;
  div.style.marginBottom = "8px";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  history.push({ who, text });
  localStorage.setItem("chatHistory", JSON.stringify(history));
}

// Toggle widget
function toggleWidget() {
  if (!widget) return;
  widget.classList.toggle("minimized");
  if (widget.classList.contains("minimized")) {
    showBtn.style.display = "block";
    localStorage.setItem("widgetState", "minimized");
  } else {
    showBtn.style.display = "none";
    localStorage.setItem("widgetState", "open");
  }
}

if (toggle) toggle.addEventListener("click", toggleWidget);

// Reopen hidden widget
if (showBtn) showBtn.addEventListener("click", () => {
  widget.classList.remove("hidden");
  if (!widget.classList.contains("minimized")) showBtn.style.display = "none";
});

// Theme toggle
if (themeToggle)
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

// Handle user input
if (input)
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
      const msg = input.value.trim();
      appendMessage("You", msg);
      input.value = "";

      const typingDiv = document.createElement("div");
      typingDiv.innerHTML = `<strong>Bot:</strong> <em>typing...</em>`;
      typingDiv.style.marginBottom = "8px";
      messages.appendChild(typingDiv);
      messages.scrollTop = messages.scrollHeight;

      try {
        const res = await fetch(workerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        typingDiv.innerHTML = `<strong>Bot:</strong> ${data.reply}`;
      } catch (err) {
        typingDiv.innerHTML = `<strong>Bot:</strong> Error, try again.`;
        console.error(err);
      }
    }
  });
