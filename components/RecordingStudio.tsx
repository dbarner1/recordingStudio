'use client'

import { useState, useRef, useEffect } from 'react'
import BeatPlayer from './BeatPlayer'
import VoiceRecorder from './VoiceRecorder'
import EffectsPanel from './EffectsPanel'
import RealTimeAudioProcessor from './RealTimeAudioProcessor'
import styles from './RecordingStudio.module.css'

interface RecordingStudioProps {
  beatFile: File
  beatUrl: string
  onReset: () => void
}

export default function RecordingStudio({ beatFile, beatUrl, onReset }: RecordingStudioProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [autotuneEnabled, setAutotuneEnabled] = useState(false)
  const [autotuneAmount, setAutotuneAmount] = useState(50)
  const [rootNote, setRootNote] = useState('C')
  const [scaleType, setScaleType] = useState('major')
  const [reverbAmount, setReverbAmount] = useState(0)
  const [echoAmount, setEchoAmount] = useState(0)
  const [beatVolume, setBeatVolume] = useState(50)
  const [voiceVolume, setVoiceVolume] = useState(100)

  const handleRecordingComplete = (audioBlob: Blob) => {
    setRecordedAudio(audioBlob)
    const url = URL.createObjectURL(audioBlob)
    setRecordedUrl(url)
    setIsRecording(false)
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setRecordedAudio(null)
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl(null)
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
  }

  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl])

  return (
    <div className={styles.studio}>
      <div className={styles.header}>
        <div className={styles.beatInfo}>
          <h2>Beat: {beatFile.name}</h2>
          <button onClick={onReset} className={styles.resetButton}>
            Change Beat
          </button>
        </div>
      </div>

      {/* Real-time audio processor - records clean audio without effects */}
      <RealTimeAudioProcessor
        beatUrl={beatUrl}
        isRecording={isRecording}
        beatVolume={beatVolume}
        voiceVolume={voiceVolume}
        onRecordingComplete={handleRecordingComplete}
      />

      <div className={styles.controls}>
        <BeatPlayer beatUrl={beatUrl} isPlaying={isRecording} />
        
        <VoiceRecorder
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          onComplete={handleRecordingComplete}
          isRecording={isRecording}
        />
      </div>

      {/* Recording Level Controls */}
      <div className={styles.recordingLevels}>
        <h3 className={styles.levelsTitle}>Recording Levels</h3>
        <div className={styles.levelControls}>
          <div className={styles.levelControl}>
            <label className={styles.levelLabel}>
              🎵 Beat: {beatVolume}%
              <input
                type="range"
                min="0"
                max="100"
                value={beatVolume}
                onChange={(e) => setBeatVolume(Number(e.target.value))}
                className={styles.levelSlider}
                disabled={isRecording}
              />
            </label>
          </div>
          <div className={styles.levelControl}>
            <label className={styles.levelLabel}>
              🎤 Voice: {voiceVolume}%
              <input
                type="range"
                min="0"
                max="100"
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(Number(e.target.value))}
                className={styles.levelSlider}
                disabled={isRecording}
              />
            </label>
          </div>
        </div>
      </div>

      {recordedUrl && (
        <EffectsPanel
          audioUrl={recordedUrl}
          autotuneEnabled={autotuneEnabled}
          autotuneAmount={autotuneAmount}
          rootNote={rootNote}
          scaleType={scaleType}
          reverbAmount={reverbAmount}
          echoAmount={echoAmount}
          onAutotuneToggle={setAutotuneEnabled}
          onAutotuneChange={setAutotuneAmount}
          onRootNoteChange={setRootNote}
          onScaleTypeChange={setScaleType}
          onReverbChange={setReverbAmount}
          onEchoChange={setEchoAmount}
          beatVolume={beatVolume}
          voiceVolume={voiceVolume}
          onBeatVolumeChange={setBeatVolume}
          onVoiceVolumeChange={setVoiceVolume}
        />
      )}
    </div>
  )
}

