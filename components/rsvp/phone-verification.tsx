"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

type TurnstileApi = {
  render(element: HTMLElement, options: {
    sitekey: string
    action: string
    callback(token: string): void
    "expired-callback"(): void
    "error-callback"(): void
  }): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

type CaptchaWindow = Window & { turnstile?: TurnstileApi }
type CaptchaConfig = { siteKey: string; scriptUrl: string }

export function PhoneVerification({
  invitationToken,
  mobile,
  onVerified,
}: {
  invitationToken: string
  mobile: string
  onVerified: (proof: string) => void
}) {
  const [challenge, setChallenge] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState("")
  const [captchaConfig, setCaptchaConfig] = useState<CaptchaConfig | null>(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const widgetElement = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/rsvp/phone/request", { signal: controller.signal })
      .then(async (response) => {
        const config = await response.json()
        if (!response.ok) throw new Error("Human verification is temporarily unavailable")
        setCaptchaConfig(config)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Human verification is temporarily unavailable")
      })
    return () => {
      controller.abort()
      if (widgetId.current) (window as CaptchaWindow).turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [])

  function renderCaptcha() {
    const api = (window as CaptchaWindow).turnstile
    if (!captchaConfig || !widgetElement.current || !api || widgetId.current) return
    widgetId.current = api.render(widgetElement.current, {
      sitekey: captchaConfig.siteKey,
      action: "rsvp_otp",
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => {
        setCaptchaToken("")
        setError("Human verification could not load. Please refresh and try again.")
      },
    })
  }

  async function sendCode() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/rsvp/phone/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken, mobile, captchaToken }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Could not send a verification code")
        return
      }
      setChallenge(data.challenge)
      setCode("")
    } catch {
      setError("Could not send a verification code. Please try again.")
    } finally {
      setBusy(false)
      setCaptchaToken("")
      if (widgetId.current) (window as CaptchaWindow).turnstile?.reset(widgetId.current)
    }
  }

  async function verifyCode() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/rsvp/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken, mobile, challenge, code }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Could not verify the code")
        return
      }
      setVerified(true)
      onVerified(data.proof)
    } catch {
      setError("Could not verify the code. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  if (verified) return <p role="status" className="text-sm text-sage-700">Phone verified</p>

  return (
    <div className="space-y-3 rounded-xl border border-brand-border bg-brand-surface p-4">
      <div ref={widgetElement} />
      {captchaConfig && (
        <Script
          src={captchaConfig.scriptUrl}
          onReady={renderCaptcha}
          onError={() => setError("Human verification could not load. Please refresh and try again.")}
        />
      )}
      {challenge ? (
        <>
          <p className="text-sm text-brand-text-muted">Enter the code sent by text message.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="rsvp-verification-code" className="label">Verification code</label>
              <input
                id="rsvp-verification-code"
                className="input w-44"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <button type="button" onClick={verifyCode} disabled={busy || !/^\d{4,10}$/.test(code)} className="btn btn-primary">
              Verify phone
            </button>
          </div>
          <button type="button" onClick={sendCode} disabled={busy || !captchaToken} className="text-sm font-medium text-brand-primary">
            Resend code
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-brand-text-muted">
            We’ll text you a verification code to confirm this number.
          </p>
          <button type="button" onClick={sendCode} disabled={busy || !mobile.trim() || !captchaToken} className="btn btn-secondary">
            Send verification code
          </button>
        </>
      )}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </div>
  )
}
