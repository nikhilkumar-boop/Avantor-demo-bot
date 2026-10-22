# Aventur demo bot (stand-in third-party bot for Webex Connect)

Run locally:  npm install && npm start   (listens on port 3000)
Env vars:     API_KEY (default: aventur-demo-key), PORT (default: 3000)

POST /api/v1/message      body: {"sessionId":"...","text":"...","customerName":"..."}
                          header: Authorization: Bearer <API_KEY>
                          returns: sessionId, action (continue | handoff | agent_active), reply, intent, summary, transcript
DELETE /api/v1/session/:id   clears the session when the chat closes
GET /health               warm-up / health check

Hand-off triggers: customer types agent / human / person / representative / complaint, or 2 unanswered questions in a row.
