// VoteBuddy AI - Production Clean Build

let messages = [];
let chats = JSON.parse(localStorage.getItem("allChats") || "[]");
let currentChatId = null;
let isTyping = false;
let isEditing = false;
let editIndex = null;
let lastUserMessage = "";
let isRetrying = false;
let lastSent = 0;


// Unused functions removed


function renderSidebar() {
  const chatList = document.getElementById("chat-list");
  if (!chatList) return;
  chatList.innerHTML = "";
  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-item" + (chat.id === currentChatId ? " active" : "");
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    
    const titleSpan = document.createElement("span");
    titleSpan.className = "chat-item-title";
    titleSpan.innerText = chat.title;
    titleSpan.onclick = () => loadChat(chat.id);
    
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "✖";
    deleteBtn.className = "chat-delete-btn";
    deleteBtn.style.background = "none";
    deleteBtn.style.border = "none";
    deleteBtn.style.color = "rgba(255,255,255,0.5)";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.onclick = (e) => {
       e.stopPropagation();
       chats = chats.filter(c => c.id !== chat.id);
       localStorage.setItem("allChats", JSON.stringify(chats));
       if (currentChatId === chat.id) {
          messages = [];
          currentChatId = null;
          const container = document.getElementById("chat-container");
          if(container) container.innerHTML = "";
          appendMessage("ai", "Hi! I'm VoteBuddy. How can I help you today?", { isWelcome: true });
       }
       renderSidebar();
    };
    
    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    chatList.appendChild(item);
  });
}

function loadChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  messages = [...chat.messages];
  const container = document.getElementById("chat-container");
  if (container) container.innerHTML = "";
  messages.forEach((m, i) => appendMessage(m.role, m.text, { index: i, isWelcome: i === 0 && m.role === "ai" }));
  renderSidebar();
}

function safeFormat(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}

function appendMessage(role, text, options = {}) {
  const msgIndex = options.index !== undefined ? options.index : messages.length - 1;
  const container = document.getElementById("chat-container");
  if (!container) return;

  const msg = document.createElement("div");
  msg.className = role === "user" ? "message user-message" : "message ai-message";
  msg.dataset.index = msgIndex;
  
  const textSpan = document.createElement("div");
  textSpan.innerHTML = safeFormat(text);
  textSpan.style.marginBottom = "8px";
  msg.appendChild(textSpan);

  container.appendChild(msg);

  // Remove thinking indicators when a new real message is added
  const indicators = document.querySelectorAll(".thinking");
  indicators.forEach(i => i.remove());

  if (!options.isWelcome) {
    const actionContainer = document.createElement("div");
    actionContainer.className = "msg-actions";
    actionContainer.dataset.index = msgIndex;
    if (role === "user") actionContainer.style.justifyContent = "flex-end";

    const copyBtn = document.createElement("button");
    copyBtn.innerText = "Copy";
    copyBtn.className = "glass-btn copy-btn";

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerText = "Copied!";
      setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
    };
    actionContainer.appendChild(copyBtn);

    if (role === "user") {
      const editBtn = document.createElement("button");
      editBtn.innerText = "Edit";
      editBtn.className = "glass-btn edit-btn";

      editBtn.onclick = () => {
        const input = document.getElementById("input");
        if (input) {
          input.value = text;
        }
        
        editIndex = messages.findIndex(m => m.role === "user" && m.text === text);
        isEditing = true;
        
        let cancelBtn = document.getElementById("cancel-edit-btn");
        if (!cancelBtn) {
          cancelBtn = document.createElement("button");
          cancelBtn.id = "cancel-edit-btn";
          cancelBtn.innerText = "Cancel Edit";
          cancelBtn.className = "glass-btn";
          cancelBtn.style.position = "absolute";
          cancelBtn.style.top = "-30px";
          cancelBtn.style.right = "10px";
          cancelBtn.style.background = "rgba(255,0,0,0.5)";
          
          cancelBtn.onclick = () => {
             isEditing = false;
             editIndex = null;
             if(input) input.value = "";
             cancelBtn.style.display = "none";
          };
          if(input && input.parentElement) {
            input.parentElement.style.position = "relative";
            input.parentElement.appendChild(cancelBtn);
          }
        }
        if(cancelBtn) cancelBtn.style.display = "block";
      };
      actionContainer.appendChild(editBtn);
    }

    if (role === "ai") {
      // Smart Trust Signal
      let trustText = "";
      const lowerText = text.toLowerCase();
      if (lowerText.includes("not sure") || lowerText.includes("may") || lowerText.includes("usually") || lowerText.includes("generally")) {
        trustText = "⚠️ For latest updates, check official Election Commission.";
      }
      if (trustText) {
        const trust = document.createElement("div");
        trust.className = "trust-text";
        trust.innerText = trustText;
        msg.appendChild(trust);
      }
      
      // Retry Button
      const retryBtn = document.createElement("button");
      retryBtn.innerText = "🔄 Retry";
      retryBtn.className = "retry-btn";
      retryBtn.onclick = () => {
        const targetIndex = msgIndex - 1; // Index of the user message to retry
        if (targetIndex < 0) return;

        // Set retrying flag to prevent duplication in UI
        isRetrying = true;

        // Step 1: Slice messages to remove both this AI reply and the corresponding user message
        // This ensures sendMessage() adds the user message back at the SAME index.
        const userText = messages[targetIndex].text;
        messages = messages.slice(0, targetIndex);

        // Step 2: Remove ALL UI messages starting from this AI reply (keep the user message in UI)
        const allElements = document.querySelectorAll(".message, .msg-actions, .trust-text");
        allElements.forEach((el) => {
          if (parseInt(el.dataset.index) >= msgIndex) {
            el.remove();
          }
        });

        // Step 3: Put message back into input and send
        const inputEl = document.getElementById("input");
        if (inputEl) {
          inputEl.value = userText;
          sendMessage();
        }
      };
      actionContainer.appendChild(retryBtn);
    }
    
    msg.after(actionContainer);
  }
  
  // Keep scroll at bottom
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  if (isTyping) return;
  if (Date.now() - lastSent < 800) return;
  lastSent = Date.now();

  const input = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  isTyping = true;
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  if (isEditing && editIndex !== null && editIndex >= 0) {
    messages.splice(editIndex, 2);
    isEditing = false;
    editIndex = null;
    const cancelBtn = document.getElementById("cancel-edit-btn");
    if(cancelBtn) cancelBtn.style.display = "none";
    
    const container = document.getElementById("chat-container");
    if (container) container.innerHTML = "";
    messages.forEach(m => appendMessage(m.role, m.text));
  }

  messages.push({ role: "user", text });
  
  if (!isRetrying) {
    appendMessage("user", text);
  }
  isRetrying = false; // Reset flag after use
  
  updateQuickActions(text);

  if (!currentChatId) {
    currentChatId = Date.now().toString();
    chats.unshift({
      id: currentChatId,
      title: text.slice(0, 30) || "New Chat",
      messages: []
    });
  }
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) chat.messages = [...messages];
  localStorage.setItem("allChats", JSON.stringify(chats));
  renderSidebar();
  input.value = "";

  lastUserMessage = text;
  
  // PART 2: FIX THINKING ANIMATION POSITION
  const container = document.getElementById("chat-container");
  const typing = document.createElement("div");
  typing.className = "message ai-message typing thinking";
  typing.innerText = "Thinking...";
  if (container) {
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: text,
        history: messages.slice(-5) // Use last 5 as requested
      })
    });

    const data = await res.json();
    console.log("Received response");

    // Remove thinking indicator
    typing.remove();

    // Push and then append to ensure correct index in data-index
    messages.push({ role: "ai", text: data.reply });
    appendMessage("ai", data.reply);
    
    // Performance: Limit history to last 50 messages
    if (messages.length > 50) {
      messages = messages.slice(-50);
    }
    
    if (currentChatId) {
      const chat = chats.find(c => c.id === currentChatId);
      if (chat) chat.messages = [...messages];
      localStorage.setItem("allChats", JSON.stringify(chats));
    }

  } catch (err) {
    typing.remove();
    appendMessage("ai", "I couldn't get a complete answer just now, but here's a helpful starting point:\n\n• Elections allow people to choose leaders\n• Voting is your right\n\nTry asking again for more detail 👍");
  } finally {
    isTyping = false;
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}

function updateQuickActions(userMessage) {
  const container = document.getElementById("quick-actions");
  if (!container) return;

  let actions = [];
  const msg = (userMessage || "").toLowerCase();

  if (!msg) {
    actions = [
      "How to register to vote?",
      "Who can vote?",
      "How does voting work?"
    ];
  } else if (msg.includes("lost") || msg.includes("id")) {
    actions = [
      "How to reapply voter ID?",
      "Documents required for voter ID",
      "Check voter ID status"
    ];
  } else if (msg.includes("vote")) {
    actions = [
      "Steps to vote",
      "Find polling booth",
      "What documents needed"
    ];
  } else {
    actions = [
      "How to register?",
      "Who can vote?",
      "Election process"
    ];
  }

  container.innerHTML = "";

  actions.forEach(text => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.innerText = text;
    btn.onclick = () => {
      const input = document.getElementById("input");
      if(input) input.value = text;
      sendMessage();
    };
    container.appendChild(btn);
  });
}

// Global function for quick actions (used in inline onclick handlers)
window.sendQuickAction = function(text) {
  const input = document.getElementById("input");
  if (input) {
    input.value = text;
    sendMessage();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    appendMessage("ai", "Hi! I'm VoteBuddy. How can I help you today?", { index: 0, isWelcome: true });
  }

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("input");

  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      sendMessage();
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Mic logic
  const micBtn = document.getElementById("mic-btn");
  if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    
    let isRecording = false;

    micBtn.addEventListener("click", () => {
      if (!isRecording) {
        let userLang = navigator.language || "en-US";
        if (/te/i.test(userLang)) recognition.lang = "te-IN";
        else if (/hi/i.test(userLang)) recognition.lang = "hi-IN";
        else recognition.lang = "en-US";
        
        micBtn.classList.add("recording");
        const statusEl = document.querySelector(".mic-status");
        if(statusEl) statusEl.innerText = "Listening...";
        recognition.start();
        isRecording = true;
      } else {
        recognition.stop();
        isRecording = false;
        micBtn.classList.remove("recording");
        const statusEl = document.querySelector(".mic-status");
        if(statusEl) statusEl.innerText = "";
      }
    });

    recognition.onresult = (event) => {
      const result = event.results[0];
      const text = result[0].transcript;
      if (input) {
        input.value = text;
        console.log("Mic text filled");
      }
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove("recording");
      const statusEl = document.querySelector(".mic-status");
      if(statusEl) statusEl.innerText = "";
    };
    
    recognition.onerror = (e) => {
      console.error("Mic error:", e.error);
      isRecording = false;
      micBtn.classList.remove("recording");
      const statusEl = document.querySelector(".mic-status");
      if(statusEl) statusEl.innerText = "";
    }
  } else if (micBtn) {
    micBtn.addEventListener("click", () => {
        alert("Speech Recognition is not supported in this browser.");
    });
  }

  // Basic Sidebar Handlers (no complex chat switching)
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  if (sidebarToggle && sidebar && sidebarOverlay) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
    });
  }

  if (closeSidebarBtn && sidebar && sidebarOverlay) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
  }

  // New Chat Button - clears view, resets state
  const newChatBtn = document.getElementById("new-chat-btn");
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      messages = [];
      currentChatId = null;
      renderSidebar();
      const container = document.getElementById("chat-container");
      if(container) container.innerHTML = "";
      appendMessage("ai", "Hi! I'm VoteBuddy. How can I help you today?", { isWelcome: true });
      updateQuickActions("");
      if (sidebar && sidebarOverlay) {
        sidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
      }
    });
  }

  // Ripple effect logic for all buttons
  document.addEventListener("click", function(e) {
    const btn = e.target.closest("button");
    if (btn) {
      const circle = document.createElement("span");
      circle.classList.add("ripple");

      const rect = btn.getBoundingClientRect();
      // Calculate center to make ripple start exactly where clicked
      circle.style.left = (e.clientX - rect.left) + "px";
      circle.style.top = (e.clientY - rect.top) + "px";

      btn.appendChild(circle);

      setTimeout(() => circle.remove(), 600);
    }
  });
});
