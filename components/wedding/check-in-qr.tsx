import { checkInQrMatrix } from "@/lib/check-in-qr"

export default function CheckInQr({ code }: { code: string }) {
  const modules = checkInQrMatrix(code)
  const path = modules.flatMap((row, y) =>
    row.map((dark, x) => dark ? `M${x + 4},${y + 4}h1v1h-1z` : ""),
  ).join("")
  return (
    <figure className="flex flex-col items-center gap-2 rounded-2xl border border-ivory-200 bg-white p-5 text-ink-900">
      <svg viewBox="0 0 33 33" role="img" aria-label="Group check-in QR code" className="h-40 w-40" shapeRendering="crispEdges">
        <rect width="33" height="33" fill="white" />
        <path d={path} fill="black" />
      </svg>
      <figcaption className="text-center text-sm">
        Show this QR code when your group arrives.
        <code className="mt-1 block break-all text-xs">{code}</code>
      </figcaption>
    </figure>
  )
}
