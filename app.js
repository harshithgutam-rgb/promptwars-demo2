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
let currentAudio = null;

function handlePlay(audioUrl, fallbackText = null) {
  try {
    console.log("Play button clicked");

    // Stop previous audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    
    // Stop any ongoing browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (audioUrl) {
      // Create new audio
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      // Play audio
      audio.play().then(() => {
        console.log("Audio started");
      }).catch(() => {
        console.log("Audio play failed");
      });

      // Reset after finish
      audio.onended = () => {
        currentAudio = null;
        console.log("Audio stopped");
      };
    } else if (fallbackText && 'speechSynthesis' in window) {
      console.log("Using browser SpeechSynthesis fallback");
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      
      // Clean text for better TTS flow
      utterance.text = fallbackText.replace(/[\u{1F600}-\u{1F6FF}]/gu, "").replace(/[*#•-]/g, "").trim();
      
      // Adjust pitch and rate to make it sound more natural and less robotic
      utterance.pitch = 1.05; 
      utterance.rate = 0.95; 

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      // Detect Hindi vs English roughly
      if (/[\u0900-\u097F]/.test(fallbackText)) {
        utterance.lang = "hi-IN";
        selectedVoice = voices.find(v => v.lang.includes("hi") && (v.name.includes("Google") || v.name.includes("Natural")));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes("hi"));
      } else {
        utterance.lang = "en-US";
        // Look for the most natural English voices available on the user's OS/Browser
        const enVoices = voices.filter(v => v.lang.startsWith("en"));
        selectedVoice = enVoices.find(v => 
          v.name.includes("Google") || 
          v.name.includes("Natural") || 
          v.name.includes("Premium") || 
          v.name.includes("Siri") || 
          v.name.includes("Samantha")
        );
        // If no premium voice is found, try to avoid the most robotic default ones if possible
        if (!selectedVoice) {
           selectedVoice = enVoices.find(v => v.name.includes("Microsoft Mark") || v.name.includes("Microsoft George")); 
        }
        if (!selectedVoice) selectedVoice = enVoices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Selected Voice:", selectedVoice.name);
      }

      window.speechSynthesis.speak(utterance);
    }

  } catch (err) {
    console.log("TTS error safely handled");
  }
}



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

  // Mobile usability: Close sidebar after loading a chat
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (window.innerWidth <= 768 && sidebar && overlay) {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }
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

      // Play Audio Button (Persistent on every message)
      const playBtn = document.createElement("button");
      playBtn.innerText = "🔊 Play";
      playBtn.className = "retry-btn audio-play-btn";
      playBtn.onclick = () => {
        const audioData = msg.dataset.audio;
        if (audioData && audioData !== "null" && audioData !== "undefined") {
          try {
            const binaryString = window.atob(audioData);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(blob);
            
            handlePlay(audioUrl);
          } catch (e) {
            console.log("Failed to parse base64 audio, using fallback");
            handlePlay(null, text);
          }
        } else {
          console.log("[TTS] No audio available for this message, using fallback.");
          handlePlay(null, text);
        }
      };
      actionContainer.appendChild(playBtn);
      
      if (options.audio) {
        msg.dataset.audio = options.audio;
      }
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

    let data = {};
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Failed to parse API response as JSON:", parseErr);
      throw new Error("Invalid API response format");
    }

    // Remove thinking indicator
    typing.remove();

    // Push and then append to ensure correct index in data-index
    messages.push({ role: "ai", text: data.reply });
    appendMessage("ai", data.reply, { audio: data.audio });
    
    if (data.audio) {
       showToast("Audio response ready 🔊");
    }

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
      circle.style.left = (e.clientX - rect.left) + "px";
      circle.style.top = (e.clientY - rect.top) + "px";

      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }
  });

  // Removed obsolete TTS Toggle Initialization
});

/**
 * Displays a non-intrusive notification to the user.
 */
function showToast(text) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style = "position:fixed; bottom:120px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:30px; font-size:13px; z-index:10000; pointer-events:none; transition:0.3s; opacity:0;";
    document.body.appendChild(toast);
  }
  toast.innerText = text;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 3000);
}

// Add CSS for the audio button to match retry button
const style = document.createElement('style');
style.textContent = `
  .audio-play-btn {
    background: rgba(139, 92, 246, 0.15) !important;
    border-color: rgba(139, 92, 246, 0.3) !important;
    color: #a78bfa !important;
    margin-left: 5px;
  }
  .audio-play-btn:hover {
    background: rgba(139, 92, 246, 0.25) !important;
    border-color: #8b5cf6 !important;
    color: #fff !important;
  }
`;
document.head.appendChild(style);
