'use client'

import { useRef, useEffect } from 'react'
import styles from './PitchVisualization.module.css'

interface PitchDataPoint {
  time: number
  originalFreq: number
  correctedFreq: number
  originalNote: string
  correctedNote: string
}

interface PitchVisualizationProps {
  pitchData: PitchDataPoint[]
  duration: number
}

export default function PitchVisualization({ pitchData, duration }: PitchVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || pitchData.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find frequency range
    let minFreq = Infinity
    let maxFreq = -Infinity
    pitchData.forEach(point => {
      minFreq = Math.min(minFreq, point.originalFreq, point.correctedFreq)
      maxFreq = Math.max(maxFreq, point.originalFreq, point.correctedFreq)
    })

    // Add some padding to the frequency range
    const freqRange = maxFreq - minFreq
    minFreq = Math.max(80, minFreq - freqRange * 0.1)
    maxFreq = maxFreq + freqRange * 0.1

    // Helper to convert frequency to Y coordinate
    const freqToY = (freq: number) => {
      const normalized = (freq - minFreq) / (maxFreq - minFreq)
      return height - padding - (normalized * (height - padding * 2))
    }

    // Helper to convert time to X coordinate
    const timeToX = (time: number) => {
      return padding + (time / duration) * (width - padding * 2)
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * (height - padding * 2)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw original pitch line (red)
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < pitchData.length; i++) {
      const point = pitchData[i]
      const x = timeToX(point.time)
      const y = freqToY(point.originalFreq)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw corrected pitch line (green)
    ctx.strokeStyle = '#51cf66'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < pitchData.length; i++) {
      const point = pitchData[i]
      const x = timeToX(point.time)
      const y = freqToY(point.correctedFreq)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw data points and correction lines
    pitchData.forEach((point, index) => {
      if (index % 5 === 0) { // Draw every 5th point to avoid clutter
        const x = timeToX(point.time)
        
        // Draw line connecting original to corrected if there's a correction
        if (Math.abs(point.originalFreq - point.correctedFreq) > 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(x, freqToY(point.originalFreq))
          ctx.lineTo(x, freqToY(point.correctedFreq))
          ctx.stroke()
          ctx.setLineDash([])
        }
        
        // Original point
        ctx.fillStyle = '#ff6b6b'
        ctx.beginPath()
        ctx.arc(x, freqToY(point.originalFreq), 4, 0, Math.PI * 2)
        ctx.fill()

        // Corrected point
        ctx.fillStyle = '#51cf66'
        ctx.beginPath()
        ctx.arc(x, freqToY(point.correctedFreq), 4, 0, Math.PI * 2)
        ctx.fill()

        // Draw note labels for corrections
        if (Math.abs(point.originalFreq - point.correctedFreq) > 1 && index % 10 === 0) {
          ctx.fillStyle = 'rgba(255, 107, 107, 0.8)'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(point.originalNote, x, freqToY(point.originalFreq) - 8)
          
          ctx.fillStyle = 'rgba(81, 207, 102, 0.8)'
          ctx.fillText(point.correctedNote, x, freqToY(point.correctedFreq) + 15)
        }
      }
    })

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Frequency (Hz)', padding, padding - 10)
    
    ctx.textAlign = 'right'
    ctx.fillText('Time (s)', width - padding, height - 10)

    // Draw frequency labels
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    for (let i = 0; i <= 5; i++) {
      const freq = minFreq + (i / 5) * (maxFreq - minFreq)
      const y = freqToY(freq)
      ctx.fillText(Math.round(freq).toString(), padding - 10, y + 4)
    }

    // Draw time labels
    ctx.textAlign = 'center'
    for (let i = 0; i <= 5; i++) {
      const time = (i / 5) * duration
      const x = timeToX(time)
      ctx.fillText(time.toFixed(1), x, height - padding + 20)
    }

    // Draw legend
    const legendY = padding + 20
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(width - 150, legendY, 15, 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.textAlign = 'left'
    ctx.fillText('Original', width - 130, legendY + 5)

    ctx.fillStyle = '#51cf66'
    ctx.fillRect(width - 150, legendY + 15, 15, 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText('Corrected', width - 130, legendY + 20)

  }, [pitchData, duration])

  if (pitchData.length === 0) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>Pitch Correction Visualization</h4>
        <p className={styles.emptyMessage}>
          Enable autotune and click "Play with Effects" to see pitch visualization.
          <br />
          The graph will show your original pitch (red) and corrected pitch (green).
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Pitch Correction Visualization</h4>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className={styles.canvas}
      />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Data Points:</span>
          <span className={styles.statValue}>{pitchData.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Corrections:</span>
          <span className={styles.statValue}>
            {pitchData.filter(p => Math.abs(p.originalFreq - p.correctedFreq) > 1).length}
          </span>
        </div>
      </div>
    </div>
  )
}

