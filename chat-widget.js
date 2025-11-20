const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');

// Replace with your deployed Worker URL
const workerUrl = "https://gpt-chat-widget.mukechiwarichard.workers.dev";

function appendMessage(who, text) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${who}:</strong> ${text}`;
  div.style.marginBottom = "8px";
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

input.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && input.value.trim() !== "") {
    const msg = input.value;
    appendMessage('You', msg);
    input.value = "";

    appendMessage('Bot', '...'); // loading indicator

    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      messages.lastChild.innerHTML = `<strong>Bot:</strong> ${data.reply}`;
    } catch (err) {
      messages.lastChild.innerHTML = `<strong>Bot:</strong> Error, try again.`;
      console.error(err);
    }
  }
});
