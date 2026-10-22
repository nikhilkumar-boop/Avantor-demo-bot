// Aventur demo bot - a stand-in "third-party bot" for the Webex Connect demo
const express = require("express");
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || "aventur-demo-key";
const PORT = process.env.PORT || 3000;
const sessions = {}; // sessionId -> { mode, fallbacks, transcript[] }

// Simple security check: Webex Connect sends "Authorization: Bearer <API_KEY>"
function auth(req, res, next) {
  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

const FAQ = [
  { intent: "greeting", words: ["hi", "hello", "hey"], reply: "Hi! I'm the Aventur assistant. Ask me about opening hours, order status or returns. Type 'agent' anytime to talk to a person." },
  { intent: "hours", words: ["hours", "timing", "open"], reply: "We're open Monday to Friday, 9 AM to 6 PM." },
  { intent: "order_status", words: ["order", "track", "delivery"], reply: "Your order is on its way and should arrive in 2-3 working days." },
  { intent: "returns", words: ["return", "refund"], reply: "You can return any item within 30 days. Refunds take 5-7 working days." }
];
const HANDOFF_WORDS = ["agent", "human", "person", "representative", "complaint"];

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/v1/message", auth, (req, res) => {
  const { sessionId, text = "", customerName = "Customer" } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const s = (sessions[sessionId] ||= { mode: "BOT", fallbacks: 0, transcript: [], name: customerName });
  const msg = String(text).toLowerCase();

  // Guard: once handed off, the bot never answers again for this session
  if (s.mode === "AGENT") {
    return res.json({ sessionId, action: "agent_active", reply: "", intent: "", summary: "", transcript: "" });
  }

  s.transcript.push(`Customer: ${text}`);
  let action = "continue", reply, intent = "unknown", reason = "";

  if (HANDOFF_WORDS.some(w => msg.includes(w))) {
    action = "handoff"; reason = "customer_requested"; intent = "agent_request";
    reply = "Sure, connecting you to one of our agents now. Please wait a moment.";
  } else {
    const hit = FAQ.find(f => f.words.some(w => msg.split(/\W+/).includes(w)));
    if (hit) {
      s.fallbacks = 0; intent = hit.intent; reply = hit.reply;
    } else if (++s.fallbacks >= 2) {
      action = "handoff"; reason = "bot_could_not_answer";
      reply = "I'm not able to help with that. Let me connect you to an agent.";
    } else {
      reply = "Sorry, I didn't get that. You can ask about hours, order status or returns, or type 'agent'.";
    }
  }

  s.transcript.push(`Bot: ${reply}`);
  if (action === "handoff") s.mode = "AGENT";

  const summary = action === "handoff"
    ? `Handoff reason: ${reason}. Last customer message: "${text}"` : "";
  res.json({
    sessionId, action, reply, intent, summary,
    transcript: action === "handoff" ? "--- Bot conversation ---\n" + s.transcript.join("\n") : ""
  });
});

// Called when the chat is closed so the bot clears its session
app.delete("/api/v1/session/:id", auth, (req, res) => {
  delete sessions[req.params.id];
  res.json({ sessionId: req.params.id, status: "closed" });
});

app.listen(PORT, () => console.log(`Aventur demo bot listening on port ${PORT}`));
