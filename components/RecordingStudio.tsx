'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  const [voiceBuffer, setVoiceBuffer] = useState<AudioBuffer | null>(null)
  const [beatBuffer, setBeatBuffer] = useState<AudioBuffer | null>(null)
  const [autotuneEnabled, setAutotuneEnabled] = useState(false)
  const [autotuneAmount, setAutotuneAmount] = useState(50)
  const [rootNote, setRootNote] = useState('C')
  const [scaleType, setScaleType] = useState('major')
  const [reverbAmount, setReverbAmount] = useState(0)
  const [echoAmount, setEchoAmount] = useState(0)
  const [pitchShift, setPitchShift] = useState(0)
  const [beatVolume, setBeatVolume] = useState(50)
  const [voiceVolume, setVoiceVolume] = useState(100)

  const handleRecordingComplete = useCallback(async (voiceBuf: AudioBuffer, beatBuf: AudioBuffer, duration: number) => {
    setVoiceBuffer(voiceBuf)
    setBeatBuffer(beatBuf)
    setIsRecording(false)
    
    // Create a temporary URL for the mixed audio (for backward compatibility)
    // EffectsPanel will handle the actual mixing with effects
    const context = new AudioContext()
    const mixedBuffer = context.createBuffer(2, voiceBuf.length, voiceBuf.sampleRate)
    const voiceChannel = voiceBuf.getChannelData(0)
    const beatChannel = beatBuf.getChannelData(0)
    const leftChannel = mixedBuffer.getChannelData(0)
    const rightChannel = mixedBuffer.getChannelData(1)
    
    for (let i = 0; i < voiceBuf.length; i++) {
      const mixed = (voiceChannel[i] || 0) + (beatChannel[i] || 0)
      leftChannel[i] = mixed
      rightChannel[i] = mixed
    }
    
    // Convert to blob for URL
    const wav = audioBufferToWav(mixedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    setRecordedAudio(blob)
    setRecordedUrl(url)
  }, [])
  
  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)
    const channels: Float32Array[] = []
    
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return arrayBuffer
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

      {recordedUrl && voiceBuffer && beatBuffer && (
        <EffectsPanel
          audioUrl={recordedUrl}
          voiceBuffer={voiceBuffer}
          beatBuffer={beatBuffer}
          autotuneEnabled={autotuneEnabled}
          autotuneAmount={autotuneAmount}
          rootNote={rootNote}
          scaleType={scaleType}
          reverbAmount={reverbAmount}
          echoAmount={echoAmount}
          pitchShift={pitchShift}
          onAutotuneToggle={setAutotuneEnabled}
          onAutotuneChange={setAutotuneAmount}
          onRootNoteChange={setRootNote}
          onScaleTypeChange={setScaleType}
          onReverbChange={setReverbAmount}
          onEchoChange={setEchoAmount}
          onPitchShiftChange={setPitchShift}
          beatVolume={beatVolume}
          voiceVolume={voiceVolume}
          onBeatVolumeChange={setBeatVolume}
          onVoiceVolumeChange={setVoiceVolume}
        />
      )}
    </div>
  )
}

