"use client";

import { useRef, useEffect, useState } from "react"

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: ChartDataPoint[]
  height?: number
  showGrid?: boolean
  showLabels?: boolean
  maxValue?: number
  className?: string
}

/** Warm gold bars that fade up from the baseline. */
export default function BarChart({
  data,
  height = 200,
  showGrid = true,
  showLabels = true,
  maxValue,
  className = "",
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [animationProgress, setAnimationProgress] = useState(0)

  useEffect(() => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 0.05
      if (progress >= 1) {
        progress = 1
        clearInterval(interval)
      }
      setAnimationProgress(progress)
    }, 30)
    return () => clearInterval(interval)
  }, [])

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      <div className="relative flex h-full items-end justify-center gap-2 px-2 pb-2">
        {showGrid && (
          <div className="absolute inset-0 flex flex-col justify-between">
            {[4, 3, 2, 1].map((i) => (
              <div key={i} className="flex-1 border-t border-dashed border-ivory-200" />
            ))}
          </div>
        )}

        <div className="flex h-full w-full items-end justify-center gap-2">
          {data.map((item, index) => (
            <div
              key={item.label}
              className="flex w-full max-w-[40px] flex-col items-center"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div
                className="w-full rounded-t-md transition-all duration-1000 ease-refined"
                style={{
                  height: `${(item.value / max) * (height - 40) * animationProgress}px`,
                  background: item.color
                    ? item.color
                    : "linear-gradient(180deg, #D9BE87 0%, #B28F4C 100%)",
                  minHeight: "4px",
                }}
              />

              {showLabels && (
                <>
                  <span className="mt-2 whitespace-nowrap text-xs font-medium text-ink-700">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-xs text-ink-400">{item.label}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
