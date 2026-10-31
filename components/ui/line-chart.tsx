"use client"

import { useRef, useEffect, useState } from "react"

interface LineChartDataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: LineChartDataPoint[]
  height?: number
  color?: string
  fillColor?: string
  showPoints?: boolean
  showGrid?: boolean
  className?: string
}

export default function LineChart({
  data,
  height = 200,
  color = "#B28F4C",
  fillColor = "rgba(201, 169, 97, 0.22)",
  showPoints = true,
  showGrid = true,
  className = "",
}: LineChartProps) {
  const containerRef = useRef<SVGSVGElement>(null)
  const [animationProgress, setAnimationProgress] = useState(0)

  useEffect(() => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 0.03
      if (progress >= 1) {
        progress = 1
        clearInterval(interval)
      }
      setAnimationProgress(progress)
    }, 30)
    return () => clearInterval(interval)
  }, [])

  if (data.length === 0) {
    return <div className={`${className} h-[${height}px] flex items-center justify-center text-gray-400`}>No data</div>
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  const getX = (index: number) => (index / (data.length - 1)) * 100
  const getY = (value: number) => 100 - ((value - minValue) / range) * 100

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
  }))

  const pathData = points
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`
      const prev = points[i - 1]
      const cpX1 = (prev.x + p.x) / 2
      const cpY1 = prev.y
      const cpX2 = (prev.x + p.x) / 2
      const cpY2 = p.y
      return `C${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`
    })
    .join(" ")

  const fillPathData = 
    `M${points[0].x},100 ` +
    points.map(p => `L${p.x},${p.y}`).join(" ") +
    `L${points[points.length - 1].x},100 Z`

  return (
    <div className={`relative ${className}`} style={{ height: `${height}px` }}>
      <svg
        ref={containerRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        aria-label="Line chart"
      >
        {showGrid && (
          <g stroke="#e5e7eb" strokeWidth="0.5">
            {[4, 3, 2, 1].map((i) => (
              <line key={i} x1="0" y1={i * 25} x2="100" y2={i * 25} />
            ))}
            {[4, 3, 2, 1].map((i) => (
              <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="100" />
            ))}
          </g>
        )}

        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={1} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <path
          d={fillPathData}
          fill="url(#areaGradient)"
          stroke="none"
          style={{ transformOrigin: "bottom", transform: `scaleY(${animationProgress})` }}
        />

        <path
          d={pathData}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: "1000",
            strokeDashoffset: 1000 * (1 - animationProgress),
          }}
        />

        {showPoints && points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={2}
            style={{ opacity: animationProgress }}
          />
        ))}
      </svg>
    </div>
  )
}