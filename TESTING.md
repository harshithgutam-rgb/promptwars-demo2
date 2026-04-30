# Testing Strategy – VoteBuddy AI

## 🧪 Functional Testing

* Verified chat flow (user message → AI response)
* Tested retry functionality
* Validated multilingual responses
* Tested voice input (mic)

## 🔒 Security Testing

* XSS Test:
  `<script>alert(1)</script>` → safely rendered ✔

* Input validation:

  * Empty input blocked
  * Max length enforced

## ⚡ Performance Testing

* Message history limited
* Rate limiting prevents spam

## 📱 Responsiveness Testing

* Tested on mobile and desktop
* Verified layout and scrolling

## 🧠 AI Behavior Testing

* Checked incomplete responses
* Verified safe fallback responses
* Ensured no harmful output

---

## ✅ Conclusion

Application tested across functionality, security, and performance and is stable.
