/* ===============================
   ELEMENTS
================================ */
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");
const chatList = document.getElementById("chatList");
const newChatBtn = document.getElementById("newChatBtn");

const sidebar = document.querySelector(".sidebar");
const menuBtn = document.getElementById("menuBtn");
const menuBtnMobile = document.getElementById("menuBtnMobile");

/* ===============================
   SIDEBAR TOGGLE (DESKTOP + MOBILE)
================================ */
[menuBtn, menuBtnMobile].forEach(btn => {
  if (btn) {
    btn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});

// Close sidebar when chat selected (mobile UX)
chatList.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

/* ===============================
   CHAT STORAGE
================================ */
let chats = JSON.parse(localStorage.getItem("chats")) || [];
let currentChatId = null;

/* ===============================
   INIT
================================ */
if (chats.length === 0) {
  createNewChat();
} else {
  currentChatId = chats[0].id;
  renderChatList();
  loadChat(currentChatId);
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
newChatBtn.addEventListener("click", createNewChat);

/* ===============================
   FUNCTIONS
================================ */

function createNewChat() {
  const chatId = Date.now().toString();

  const newChat = {
    id: chatId,
    title: "New Chat",
    messages: []
  };

  chats.unshift(newChat);
  currentChatId = chatId;

  saveChats();
  renderChatList();
  chatArea.innerHTML = "";
}

function renderChatList() {
  chatList.innerHTML = "";

  chats.forEach(chat => {
    const li = document.createElement("li");
    li.textContent = chat.title;
    li.className = chat.id === currentChatId ? "active" : "";

    li.addEventListener("click", () => {
      loadChat(chat.id);
    });

    chatList.appendChild(li);
  });
}

function loadChat(chatId) {
  currentChatId = chatId;
  chatArea.innerHTML = "";

  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  chat.messages.forEach(msg => {
    addMessage(msg.text, msg.type, false);
  });

  renderChatList();
}

function addMessage(text, type, save = true) {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = text;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;

  if (save) {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return msg;

    chat.messages.push({ text, type });

    // Auto-title chat from first user message
    if (chat.title === "New Chat" && type === "user") {
      chat.title = text.slice(0, 30);
    }

    saveChats();
    renderChatList();
  }

  return msg;
}

/* ===============================
   SEND MESSAGE (STREAMING)
================================ */
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  const botMsg = addMessage("", "bot");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.body) {
      botMsg.textContent = "No response from server.";
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullReply += chunk;
      botMsg.textContent += chunk;
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Save final assistant message
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages[chat.messages.length - 1].text = fullReply;
      saveChats();
    }

  } catch (err) {
    console.error(err);
    botMsg.textContent = "Error connecting to AI service.";
  }
}

/* ===============================
   STORAGE
================================ */
function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
}
