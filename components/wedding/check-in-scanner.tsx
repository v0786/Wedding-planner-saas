"use client"

import { useEffect, useRef, useState } from "react"
import { FormError } from "@/components/ui/field"

type Scanner = {
  detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type ScannerWindow = Window & {
  BarcodeDetector?: new (options: { formats: string[] }) => Scanner
}

export default function CheckInScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!scanning) return
    let closed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let stream: MediaStream | undefined

    async function start() {
      try {
        const Detector = (window as ScannerWindow).BarcodeDetector
        if (!Detector || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("This browser has no QR scanner. Enter the code or find the group below.")
        }
        const detector = new Detector({ formats: ["qr_code"] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
        const video = videoRef.current
        if (closed || !video) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()

        const detect = async () => {
          if (closed) return
          try {
            const matches = await detector.detect(video)
            if (closed) return
            const match = matches.find(({ rawValue }) => /^W1:c[a-z0-9]{24}$/.test(rawValue))
            if (match) {
              setScanning(false)
              onScanRef.current(match.rawValue)
              return
            }
            timer = setTimeout(detect, 250)
          } catch {
            if (!closed) {
              setError("Camera scanning stopped. Try again or check in manually.")
              setScanning(false)
            }
          }
        }
        await detect()
      } catch (error) {
        if (!closed) {
          setError(error instanceof Error && error.name === "Error"
            ? error.message
            : "The camera is unavailable. Enter the code or find the group below.")
          setScanning(false)
        }
      }
    }
    void start()
    return () => {
      closed = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [scanning])

  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-secondary" onClick={() => {
        setError("")
        setScanning(value => !value)
      }}>
        {scanning ? "Close scanner" : "Scan QR code"}
      </button>
      {scanning && <video ref={videoRef} className="aspect-video w-full rounded-xl bg-ink-900" muted playsInline />}
      <FormError>{error}</FormError>
    </div>
  )
}
