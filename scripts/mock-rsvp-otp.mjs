// Loopback-only Verify API stub for the production-build QA flow.
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"

const port = Number(process.env.RSVP_OTP_TEST_PORT ?? 3097)
const expectedCode = process.env.RSVP_OTP_TEST_CODE ?? "123456"
const pending = new Map()
const captchaTokens = new Map()

function respond(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
  res.end(JSON.stringify(body))
}

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return respond(res, 200, { ok: true })
  }
  if (req.method === "GET" && req.url === "/turnstile.js") {
    res.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" })
    return res.end(`(() => {
      const widgets = new Map();
      async function issue(id) {
        const widget = widgets.get(id);
        if (!widget) return;
        const response = await fetch("http://127.0.0.1:${port}/captcha-token", {
          method: "POST", body: new URLSearchParams({ hostname: location.hostname }),
        });
        const data = await response.json();
        if (widgets.has(id)) {
          widget.element.textContent = "Human verification complete";
          widget.options.callback(data.token);
        }
      }
      window.turnstile = {
        render(element, options) {
          const id = crypto.randomUUID();
          widgets.set(id, { element, options });
          issue(id);
          return id;
        },
        reset(id) { issue(id); },
        remove(id) { widgets.delete(id); },
      };
    })();`)
  }
  if (req.method !== "POST") return respond(res, 404, {})
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = new URLSearchParams(Buffer.concat(chunks).toString("utf8"))
  if (req.url === "/captcha-token") {
    const token = randomBytes(32).toString("base64url")
    captchaTokens.set(token, { hostname: body.get("hostname") || "127.0.0.1", challenge_ts: new Date().toISOString() })
    return respond(res, 200, { token })
  }
  if (req.url === "/turnstile/v0/siteverify") {
    const token = body.get("response")
    const challenge = captchaTokens.get(token)
    captchaTokens.delete(token)
    if (body.get("secret") !== (process.env.TURNSTILE_SECRET_KEY || "local-test-secret") || !challenge) {
      return respond(res, 200, { success: false, "error-codes": ["invalid-input-response"] })
    }
    return respond(res, 200, { success: true, action: "rsvp_otp", ...challenge })
  }
  if (/^\/v2\/Services\/VA[0-9a-f]{32}\/Verifications$/i.test(req.url ?? "")) {
    const to = body.get("To")
    if (body.get("Channel") !== "sms" || !/^\+[1-9]\d{6,14}$/.test(to ?? "")) {
      return respond(res, 400, {})
    }
    const sid = `VE${randomBytes(16).toString("hex")}`
    pending.set(sid, to)
    return respond(res, 201, { sid, to, status: "pending" })
  }
  if (/^\/v2\/Services\/VA[0-9a-f]{32}\/VerificationCheck$/i.test(req.url ?? "")) {
    const sid = body.get("VerificationSid")
    const to = pending.get(sid)
    if (!to) return respond(res, 404, {})
    if (body.get("Code") !== expectedCode) return respond(res, 200, { sid, to, status: "pending" })
    pending.delete(sid)
    return respond(res, 200, { sid, to, status: "approved" })
  }
  return respond(res, 404, {})
}).listen(port, "127.0.0.1", () => {
  console.log(`RSVP OTP mock listening on http://127.0.0.1:${port}`)
})
