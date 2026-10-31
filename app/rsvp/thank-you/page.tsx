"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

// Warm celebration palette — gold, champagne and sage rather than neon.
const colors = ["#C9A961", "#D9BE87", "#E2CCA4", "#D3B887", "#B28F4C", "#8F7038"]

// Global styles for animations
function GlobalStyles() {
  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      @keyframes fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 0.95;
        }
        100% {
          transform: translateY(110vh) rotate(360deg);
          opacity: 0;
        }
      }
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.5s ease-out forwards;
      }
      .animate-bounce-subtle {
        animation: bounce-subtle 2s infinite;
      }
      @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  return null
}

function ConfettiPiece({ color }: { color: string }) {
  const randomX = Math.random() * 100
  const randomSize = 6 + Math.random() * 8
  const randomRotation = Math.random() * 360
  const animationDuration = 2 + Math.random() * 2
  const animationDelay = Math.random() * 0.5

  const style: React.CSSProperties = {
    left: `${randomX}%`,
    top: "-20px",
    width: `${randomSize}px`,
    height: `${randomSize}px`,
    backgroundColor: color,
    borderRadius: Math.random() > 0.5 ? "50%" : "4px",
    transform: `rotate(${randomRotation}deg)`,
    animation: `fall ${animationDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${animationDelay}s forwards`,
    opacity: 0.95,
    position: "fixed",
    pointerEvents: "none",
  }

  return <div style={style}></div>
}

function Confetti({ className = "" }: { className?: string }) {
  return (
    <div className={`${className} fixed inset-0 pointer-events-none z-20`} aria-hidden="true">
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiPiece key={i} color={colors[i % colors.length]} />
      ))}
    </div>
  )
}

function ConfettiComponent({ isActive }: { isActive: boolean }) {
  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-20" aria-hidden="true">
      {Array.from({ length: 80 }).map((_, i) => (
        <ConfettiPiece key={i} color={colors[i % colors.length]} />
      ))}
    </div>
  )
}

function ThankYouContent() {
  const searchParams = useSearchParams()
  const [editHref, setEditHref] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const invite = searchParams.get("invite")
    const edit = searchParams.get("edit")
    if (invite && edit) {
      setEditHref(`/rsvp/${encodeURIComponent(invite)}/edit?token=${encodeURIComponent(edit)}`)
    }
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)
  }, [searchParams])

  return (
    <>
      <GlobalStyles />
      <main className="flex min-h-screen items-center justify-center bg-ivory-50 paper-texture px-4 py-10 sm:py-14">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-10" aria-hidden="true">
            <Confetti />
          </div>
        )}

        <div className="relative z-10 w-full max-w-lg">
          <div className="panel px-5 py-9 text-center sm:px-10 sm:py-12">
            {/* Success Animation */}
            <div className="mx-auto w-fit text-center">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 rounded-full bg-gold-300/30 animate-pulse" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full border border-gold-300 bg-champagne-100 text-gold-600 shadow-soft">
                  <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="eyebrow mt-6">RSVP received</p>
              <h1 className="mt-3 font-display text-4xl text-ink-900 sm:text-5xl">Thank you</h1>
              <p className="lede mt-3 mx-auto max-w-sm">
                Your RSVP has been received successfully. We look forward to celebrating with you!
              </p>
              <div className="rule-gold mx-auto mt-7 max-w-[11rem]" />
            </div>

            {/* Confetti burst */}
            <ConfettiComponent isActive={showConfetti} />

            {/* Edit Link Section */}
            <div className="mt-9 text-left">
              {editHref ? (
                <div className="card-inset px-5 py-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-champagne-200 text-gold-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-display text-lg text-ink-800">Need to change something later?</p>
                      <p className="mt-1 text-sm text-ink-500">
                        Save this private link. Anyone with it can edit this RSVP.
                      </p>
                    </div>
                  </div>
                  <Link href={editHref} className="btn btn-secondary mt-5 w-full">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit my RSVP
                  </Link>
                </div>
              ) : (
                <div className="card-inset px-5 py-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ivory-200 text-ink-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.6 0L3.372 16.5c-.77 1.333.223 3 2.19 3h13.134c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.6 0L3.372 16.5z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-display text-lg text-ink-800">No edit link available</p>
                      <p className="mt-1 text-sm text-ink-500">
                        If you need to make changes, please contact the hosts directly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Share Section */}
            <div className="card-inset mt-4 px-5 py-5 text-left">
              <h3 className="font-display text-lg text-ink-800">Share with family & friends</h3>
              <p className="mt-1 text-sm text-ink-500">Help others RSVP by sharing this invitation.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "Wedding Invitation",
                        text: "You're invited! Please RSVP here.",
                        url: window.location.origin,
                      })
                    } else {
                      navigator.clipboard.writeText(window.location.origin)
                      alert("Link copied to clipboard!")
                    }
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.614l6.632-3.316m0 0a3 3 0 115.367-2.684 3 3 0 01-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.location.origin
                    navigator.clipboard.writeText(url)
                    alert("Link copied to clipboard!")
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h10a2 2 0 002-2V3a2 2 0 00-2-2H6a2 2 0 00-2 2v2m-4 8v4a2 2 0 002 2h10a2 2 0 002-2v-4m0-4H6a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4z" />
                  </svg>
                  Copy link
                </button>
              </div>
            </div>

            <p className="mt-6 text-sm text-ink-400">
              If you lose the edit link, contact the hosts and they can help.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/" className="btn btn-primary btn-lg w-full sm:w-auto">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={null}>
      <ThankYouContent />
    </Suspense>
  )
}
