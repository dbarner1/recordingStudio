'use client'

import { useRef, useEffect } from 'react'
import styles from './BeatPlayer.module.css'

interface BeatPlayerProps {
  beatUrl: string
  isPlaying: boolean
}

export default function BeatPlayer({ beatUrl, isPlaying }: BeatPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Don't play HTML audio when recording - RealTimeAudioProcessor handles playback
    // This prevents the beat from playing twice
    if (isPlaying) {
      // When recording, RealTimeAudioProcessor plays the beat via Web Audio API
      // So we don't need to play the HTML audio element
      audio.pause()
      audio.currentTime = 0
    } else {
      audio.pause()
    }
  }, [isPlaying])

  const handlePlay = () => {
    audioRef.current?.play().catch(console.error)
  }

  const handlePause = () => {
    audioRef.current?.pause()
  }

  const handleStop = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  return (
    <div className={styles.player}>
      <h3>Beat Player</h3>
      <audio ref={audioRef} src={beatUrl} loop />
      <div className={styles.controls}>
        <button onClick={handlePlay} className={styles.button}>
          ▶ Play
        </button>
        <button onClick={handlePause} className={styles.button}>
          ⏸ Pause
        </button>
        <button onClick={handleStop} className={styles.button}>
          ⏹ Stop
        </button>
      </div>
      {isPlaying && (
        <div className={styles.recordingIndicator}>
          <span className={styles.pulse}></span>
          Playing while recording...
        </div>
      )}
    </div>
  )
}

