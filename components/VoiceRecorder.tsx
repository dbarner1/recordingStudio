'use client'

import { useRef, useState, useEffect } from 'react'
import styles from './VoiceRecorder.module.css'

interface VoiceRecorderProps {
  onStart: () => void
  onStop: () => void
  onComplete: (audioBlob: Blob) => void
  isRecording: boolean
}

export default function VoiceRecorder({ 
  onStart, 
  onStop, 
  onComplete,
  isRecording 
}: VoiceRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false))
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      // Just trigger the start - actual recording is handled by RealTimeAudioProcessor
      onStart()
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (isRecording) {
      onStop()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (hasPermission === false) {
    return (
      <div className={styles.recorder}>
        <p className={styles.error}>
          Microphone permission denied. Please enable microphone access in your browser settings.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.recorder}>
      <h3>Voice Recorder</h3>
      <div className={styles.controls}>
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            className={`${styles.button} ${styles.recordButton}`}
            disabled={hasPermission === null}
          >
            🎤 Start Recording
          </button>
        ) : (
          <>
            <button 
              onClick={stopRecording} 
              className={`${styles.button} ${styles.stopButton}`}
            >
              ⏹ Stop Recording
            </button>
            <div className={styles.timer}>
              <span className={styles.pulse}></span>
              Recording: {formatTime(recordingTime)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

