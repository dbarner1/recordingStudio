'use client'

import { useState, useRef, useEffect } from 'react'
import PitchVisualization from './PitchVisualization'
import styles from './EffectsPanel.module.css'

interface EffectsPanelProps {
  audioUrl: string
  voiceBuffer: AudioBuffer
  beatBuffer: AudioBuffer
  autotuneEnabled: boolean
  autotuneAmount: number
  rootNote: string
  scaleType: string
  reverbAmount: number
  echoAmount: number
  onAutotuneToggle: (enabled: boolean) => void
  onAutotuneChange: (amount: number) => void
  onRootNoteChange: (note: string) => void
  onScaleTypeChange: (scale: string) => void
  onReverbChange: (amount: number) => void
  onEchoChange: (amount: number) => void
  beatVolume: number
  voiceVolume: number
  onBeatVolumeChange: (volume: number) => void
  onVoiceVolumeChange: (volume: number) => void
}

export default function EffectsPanel({
  audioUrl,
  voiceBuffer,
  beatBuffer,
  autotuneEnabled,
  autotuneAmount,
  rootNote,
  scaleType,
  reverbAmount,
  echoAmount,
  onAutotuneToggle,
  onAutotuneChange,
  onRootNoteChange,
  onScaleTypeChange,
  onReverbChange,
  onEchoChange,
  beatVolume,
  voiceVolume,
  onBeatVolumeChange,
  onVoiceVolumeChange,
}: EffectsPanelProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const beatSourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const reverbConvolverRef = useRef<ConvolverNode | null>(null)
  const delayNodeRef = useRef<DelayNode | null>(null)
  const delayGainRef = useRef<GainNode | null>(null)
  const feedbackGainRef = useRef<GainNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [pitchData, setPitchData] = useState<Array<{time: number, originalFreq: number, correctedFreq: number, originalNote: string, correctedNote: string}>>([])
  const [playbackVolume, setPlaybackVolume] = useState(100)
  
  // Default gain boost for louder output
  const defaultGainBoost = 1.5
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Use voiceBuffer directly (we'll mix with beatBuffer during playback)
    if (voiceBuffer) {
      setAudioBuffer(voiceBuffer)
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [voiceBuffer])

  // Create reverb impulse response
  const createReverbImpulse = (context: AudioContext, seconds: number, decay: number): AudioBuffer => {
    const sampleRate = context.sampleRate
    const length = sampleRate * seconds
    const impulse = context.createBuffer(2, length, sampleRate)
    const leftChannel = impulse.getChannelData(0)
    const rightChannel = impulse.getChannelData(1)

    for (let i = 0; i < length; i++) {
      const n = length - i
      leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay)
      rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay)
    }

    return impulse
  }

  // Scale definitions (semitone intervals from root)
  const scaleDefinitions: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11], // C, D, E, F, G, A, B
    minor: [0, 2, 3, 5, 7, 8, 10], // C, D, Eb, F, G, Ab, Bb
    pentatonic: [0, 2, 4, 7, 9], // C, D, E, G, A
    minorPentatonic: [0, 3, 5, 7, 10], // C, Eb, F, G, Bb
    dorian: [0, 2, 3, 5, 7, 9, 10], // C, D, Eb, F, G, A, Bb
    mixolydian: [0, 2, 4, 5, 7, 9, 10], // C, D, E, F, G, A, Bb
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All semitones
  }

  // Note names
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  // Get semitone offset for a root note (C = 0, C# = 1, D = 2, etc.)
  const getRootSemitone = (root: string): number => {
    return noteNames.indexOf(root)
  }

  // Convert frequency to note name
  const frequencyToNote = (frequency: number): string => {
    const a4Frequency = 440
    const a4Semitone = 9
    const semitonesFromA4 = 12 * Math.log2(frequency / a4Frequency)
    const semitone = ((Math.round(semitonesFromA4) + a4Semitone) % 12 + 12) % 12
    return noteNames[semitone]
  }

  // Get all semitones in the selected scale
  const getScaleSemitones = (root: string, scale: string): number[] => {
    const rootOffset = getRootSemitone(root)
    const intervals = scaleDefinitions[scale] || scaleDefinitions.major
    return intervals.map(interval => (interval + rootOffset) % 12)
  }

  // Find nearest note in scale
  const findNearestScaleNote = (frequency: number, root: string, scale: string): number => {
    const a4Frequency = 440 // A4 reference
    const a4Semitone = 9 // A is semitone 9 (C=0, C#=1, ..., A=9, A#=10, B=11)
    
    // Calculate how many semitones away from A4 this frequency is
    const semitonesFromA4 = 12 * Math.log2(frequency / a4Frequency)
    
    // Get the semitone within the octave (0-11)
    const currentSemitone = ((Math.round(semitonesFromA4) + a4Semitone) % 12 + 12) % 12
    
    // Get semitones in the scale (0-11)
    const scaleSemitones = getScaleSemitones(root, scale)
    
    // Find nearest semitone in scale
    let bestSemitone = currentSemitone
    let minDistance = 12
    
    for (const scaleSemitone of scaleSemitones) {
      // Calculate distance considering wraparound
      let dist = Math.abs(currentSemitone - scaleSemitone)
      if (dist > 6) dist = 12 - dist
      
      if (dist < minDistance) {
        minDistance = dist
        bestSemitone = scaleSemitone
      }
    }
    
    // Calculate the difference
    let semitoneDiff = bestSemitone - currentSemitone
    // Handle wraparound
    if (semitoneDiff > 6) semitoneDiff -= 12
    if (semitoneDiff < -6) semitoneDiff += 12
    
    // Calculate target frequency - preserve octave
    const octave = Math.floor((semitonesFromA4 + a4Semitone) / 12)
    const targetSemitoneInOctave = bestSemitone
    const targetSemitonesFromA4 = (octave * 12) + targetSemitoneInOctave - a4Semitone
    
    return a4Frequency * Math.pow(2, targetSemitonesFromA4 / 12)
  }

  const applyAutotune = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    if (!autotuneEnabled || autotuneAmount === 0) {
      return buffer
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    const sampleRate = buffer.sampleRate
    const numberOfChannels = buffer.numberOfChannels
    const length = buffer.length
    const newBuffer = audioContextRef.current!.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    )

    const correctionStrength = autotuneAmount / 100
    const windowSize = 2048
    const hopSize = 1024 // Larger hop size reduces overlap and artifacts
    const pitchTrackingData: Array<{time: number, originalFreq: number, correctedFreq: number, originalNote: string, correctedNote: string}> = []

    // Process in chunks to avoid blocking UI
    const processChunk = async (channel: number, startIndex: number, endIndex: number) => {
      return new Promise<void>((resolve) => {
        // Use requestIdleCallback or setTimeout to yield to browser
        const process = () => {
          const inputData = buffer.getChannelData(channel)
          const outputData = newBuffer.getChannelData(channel)
          
          if (startIndex === 0) {
            outputData.set(inputData)
          }

          for (let i = startIndex; i < endIndex && i < length - windowSize; i += hopSize) {
            const window = inputData.slice(i, i + windowSize)

            // Find fundamental frequency using autocorrelation
            let maxCorrelation = 0
            let bestPeriod = 0
            const minPeriod = Math.floor(sampleRate / 800)
            const maxPeriod = Math.floor(sampleRate / 80)

            // Normalize window for better correlation
            const windowMean = window.reduce((a, b) => a + Math.abs(b), 0) / window.length
            const normalizedWindow = window.map(v => v - windowMean)

            for (let period = minPeriod; period < maxPeriod && period < normalizedWindow.length / 2; period++) {
              let correlation = 0
              const compareLength = Math.min(normalizedWindow.length - period, normalizedWindow.length)
              for (let j = 0; j < compareLength; j++) {
                correlation += normalizedWindow[j] * normalizedWindow[j + period]
              }
              correlation /= compareLength
              const signalStrength = normalizedWindow.slice(0, compareLength).reduce((sum, val) => sum + val * val, 0) / compareLength
              const normalizedCorrelation = signalStrength > 0 ? correlation / Math.sqrt(signalStrength) : 0
              
              if (normalizedCorrelation > maxCorrelation) {
                maxCorrelation = normalizedCorrelation
                bestPeriod = period
              }
            }

            if (bestPeriod > 0 && maxCorrelation > 0.05) {
              const frequency = sampleRate / bestPeriod
              const targetFrequency = findNearestScaleNote(frequency, rootNote, scaleType)
              const targetPeriod = sampleRate / targetFrequency
              
              const timeInSeconds = i / sampleRate
              pitchTrackingData.push({
                time: timeInSeconds,
                originalFreq: frequency,
                correctedFreq: targetFrequency,
                originalNote: frequencyToNote(frequency),
                correctedNote: frequencyToNote(targetFrequency)
              })

              const pitchRatio = bestPeriod / targetPeriod
              const correctedRatio = 1 + (pitchRatio - 1) * correctionStrength

              const processLength = Math.min(windowSize, length - i)
              for (let j = 0; j < processLength; j++) {
                const sourcePos = i + j / correctedRatio
                const sourceIndex = Math.floor(sourcePos)
                const fraction = sourcePos - sourceIndex

                if (sourceIndex >= 0 && sourceIndex + 1 < length) {
                  outputData[i + j] = inputData[sourceIndex] * (1 - fraction) + 
                                      inputData[sourceIndex + 1] * fraction
                } else if (sourceIndex >= 0 && sourceIndex < length) {
                  outputData[i + j] = inputData[sourceIndex]
                } else {
                  outputData[i + j] = inputData[i + j]
                }
              }
            }

            // Update progress
            const progress = ((i / (length - windowSize)) * 100) / numberOfChannels + (channel * 100 / numberOfChannels)
            setProcessingProgress(Math.min(100, progress))
          }
          resolve()
        }

        // Yield to browser every chunk
        if (startIndex === 0) {
          setTimeout(process, 0)
        } else {
          process()
        }
      })
    }

    // Create Hann window function for smooth transitions
    const createHannWindow = (size: number): Float32Array => {
      const window = new Float32Array(size)
      for (let i = 0; i < size; i++) {
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)))
      }
      return window
    }

    const hannWindow = createHannWindow(windowSize)
    
    // Create overlap-add accumulator to track how many windows contribute to each sample
    const overlapCount = new Float32Array(length)
    overlapCount.fill(0)

    // Process channels sequentially with progress updates
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel)
      const outputData = newBuffer.getChannelData(channel)
      
      // Initialize output with zeros for overlap-add
      outputData.fill(0)
      
      // Track pitch correction ratio for smoothing
      let lastRatio = 1
      const ratioHistory: number[] = []

      // Process in chunks to avoid blocking UI
      const totalWindows = Math.floor((length - windowSize) / hopSize)
      const chunkSize = Math.max(1, Math.floor(totalWindows / 20)) // Process in ~20 chunks
      
      for (let chunk = 0; chunk < totalWindows; chunk += chunkSize) {
        const endChunk = Math.min(chunk + chunkSize, totalWindows)
        
        for (let windowIdx = chunk; windowIdx < endChunk; windowIdx++) {
          const i = windowIdx * hopSize
          if (i >= length - windowSize) break
          
          const window = inputData.slice(i, i + windowSize)

          // Find fundamental frequency using autocorrelation
          let maxCorrelation = 0
          let bestPeriod = 0
          const minPeriod = Math.floor(sampleRate / 800)
          const maxPeriod = Math.floor(sampleRate / 80)

          // Normalize window for better correlation
          const windowMean = window.reduce((a, b) => a + Math.abs(b), 0) / window.length
          const normalizedWindow = window.map(v => v - windowMean)

          for (let period = minPeriod; period < maxPeriod && period < normalizedWindow.length / 2; period++) {
            let correlation = 0
            const compareLength = Math.min(normalizedWindow.length - period, normalizedWindow.length)
            for (let j = 0; j < compareLength; j++) {
              correlation += normalizedWindow[j] * normalizedWindow[j + period]
            }
            correlation /= compareLength
            const signalStrength = normalizedWindow.slice(0, compareLength).reduce((sum, val) => sum + val * val, 0) / compareLength
            const normalizedCorrelation = signalStrength > 0 ? correlation / Math.sqrt(signalStrength) : 0
            
            if (normalizedCorrelation > maxCorrelation) {
              maxCorrelation = normalizedCorrelation
              bestPeriod = period
            }
          }

          if (bestPeriod > 0 && maxCorrelation > 0.05) {
            const frequency = sampleRate / bestPeriod
            const targetFrequency = findNearestScaleNote(frequency, rootNote, scaleType)
            const targetPeriod = sampleRate / targetFrequency
            
            const timeInSeconds = i / sampleRate
            pitchTrackingData.push({
              time: timeInSeconds,
              originalFreq: frequency,
              correctedFreq: targetFrequency,
              originalNote: frequencyToNote(frequency),
              correctedNote: frequencyToNote(targetFrequency)
            })

            const pitchRatio = bestPeriod / targetPeriod
            const correctedRatio = 1 + (pitchRatio - 1) * correctionStrength

            // Smooth ratio changes to avoid abrupt transitions
            ratioHistory.push(correctedRatio)
            if (ratioHistory.length > 5) ratioHistory.shift()
            const smoothedRatio = ratioHistory.reduce((a, b) => a + b, 0) / ratioHistory.length
            lastRatio = smoothedRatio

            // Process window with pitch shifting and windowing
            const processLength = Math.min(windowSize, length - i)
            const processedWindow = new Float32Array(processLength)
            
            for (let j = 0; j < processLength; j++) {
              const sourcePos = i + j / smoothedRatio
              const sourceIndex = Math.floor(sourcePos)
              const fraction = sourcePos - sourceIndex

              let sample = 0
              if (sourceIndex >= 0 && sourceIndex + 1 < length) {
                // Linear interpolation with bounds checking
                sample = inputData[sourceIndex] * (1 - fraction) + 
                         inputData[sourceIndex + 1] * fraction
              } else if (sourceIndex >= 0 && sourceIndex < length) {
                sample = inputData[sourceIndex]
              } else if (sourceIndex < 0) {
                // Before start - use first sample
                sample = inputData[0]
              } else {
                // After end - use last sample
                sample = inputData[length - 1]
              }
              
              // Apply window function
              processedWindow[j] = sample * hannWindow[j]
            }

            // Overlap-add: add processed window to output
            for (let j = 0; j < processLength && i + j < length; j++) {
              outputData[i + j] += processedWindow[j]
              overlapCount[i + j] += hannWindow[j]
            }
          } else {
            // No pitch detected - copy original with windowing
            for (let j = 0; j < Math.min(windowSize, length - i); j++) {
              if (i + j < length) {
                const windowedSample = inputData[i + j] * hannWindow[j]
                outputData[i + j] += windowedSample
                overlapCount[i + j] += hannWindow[j]
              }
            }
          }
        }
        
        // Update progress and yield to browser
        const progress = ((channel + 1) / numberOfChannels) * ((endChunk / totalWindows) * 100)
        setProcessingProgress(Math.min(100, progress))
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      // Normalize output by overlap count and apply gain boost
      let maxSample = 0
      for (let i = 0; i < length; i++) {
        if (overlapCount[i] > 0) {
          outputData[i] /= overlapCount[i]
        }
        maxSample = Math.max(maxSample, Math.abs(outputData[i]))
      }
      
      // Normalize to 90% of max to prevent clipping, then boost by 1.5x
      if (maxSample > 0) {
        const normalizeFactor = 0.9 / maxSample
        const boostFactor = 1.5 // Boost overall volume
        for (let i = 0; i < length; i++) {
          outputData[i] *= normalizeFactor * boostFactor
        }
      }
    }

    // Store pitch data for visualization
    console.log(`Autotune applied: ${pitchTrackingData.length} pitch corrections detected`)
    setPitchData(pitchTrackingData)
    setIsProcessing(false)
    setProcessingProgress(100)

    return newBuffer
  }

  const playAudio = async () => {
    if (!voiceBuffer || !beatBuffer || !audioContextRef.current) return

    const context = audioContextRef.current
    if (context.state === 'suspended') {
      context.resume()
    }

    // Stop any currently playing audio
    stopAudio()

    // Process voice with autotune if enabled
    let processedVoiceBuffer = voiceBuffer
    if (autotuneEnabled && autotuneAmount > 0) {
      // Clear previous pitch data before processing
      setPitchData([])
      // Process with autotune - this will populate pitchData (async)
      processedVoiceBuffer = await applyAutotune(voiceBuffer)
    } else {
      // When autotune is disabled, still collect pitch data for visualization
      // but don't apply corrections
      setPitchData([])
    }

    // Create sources for voice and beat
    const voiceSource = context.createBufferSource()
    const beatSource = context.createBufferSource()
    voiceSource.buffer = processedVoiceBuffer
    beatSource.buffer = beatBuffer
    
    // Calculate if beat needs to loop to match voice length
    const voiceDuration = processedVoiceBuffer.duration
    const beatDuration = beatBuffer.duration
    if (beatDuration < voiceDuration) {
      beatSource.loop = true // Loop beat if it's shorter than voice
    } else {
      beatSource.loop = false // Don't loop if beat is longer
    }

    // Create gain nodes for volume control
    const voiceGain = context.createGain()
    const beatGain = context.createGain()
    const masterGain = context.createGain()
    
    // Apply volume controls
    voiceGain.gain.value = (voiceVolume / 100) * (playbackVolume / 100) * defaultGainBoost
    beatGain.gain.value = (beatVolume / 100) * (playbackVolume / 100)
    masterGain.gain.value = 1.0
    
    // Connect voice: source -> gain -> [effects] -> master
    voiceSource.connect(voiceGain)
    let voiceNode: AudioNode = voiceGain
    
    // Add reverb to voice if enabled
    if (reverbAmount > 0) {
      const reverbConvolver = context.createConvolver()
      const dryGain = context.createGain()
      const wetGain = context.createGain()
      
      // Create impulse response for reverb
      const impulseResponse = createReverbImpulse(context, 2, 2)
      reverbConvolver.buffer = impulseResponse
      
      // Mix dry and wet signals
      const wetAmount = reverbAmount / 100
      dryGain.gain.value = 1 - wetAmount * 0.5
      wetGain.gain.value = wetAmount * 0.5
      
      // Split signal: dry and wet paths
      voiceNode.connect(dryGain)
      voiceNode.connect(reverbConvolver)
      reverbConvolver.connect(wetGain)
      
      // Merge dry and wet
      const merger = context.createGain()
      dryGain.connect(merger)
      wetGain.connect(merger)
      
      voiceNode = merger
      reverbConvolverRef.current = reverbConvolver
    }
    
    // Add echo/delay to voice if enabled
    if (echoAmount > 0) {
      const delay = context.createDelay(1.0)
      const delayGain = context.createGain()
      const feedbackGain = context.createGain()
      const echoMix = context.createGain()
      
      delay.delayTime.value = 0.3
      delayGain.gain.value = echoAmount / 100
      feedbackGain.gain.value = (echoAmount / 100) * 0.3
      echoMix.gain.value = 1.0
      
      // Connect delay chain
      voiceNode.connect(echoMix) // Direct signal
      voiceNode.connect(delay)
      delay.connect(delayGain)
      delay.connect(feedbackGain)
      feedbackGain.connect(delay) // Feedback loop
      delayGain.connect(echoMix)
      
      voiceNode = echoMix
      delayNodeRef.current = delay
      delayGainRef.current = delayGain
      feedbackGainRef.current = feedbackGain
    }
    
    // Connect voice and beat to master gain, then to destination
    voiceNode.connect(masterGain)
    beatSource.connect(beatGain)
    beatGain.connect(masterGain)
    masterGain.connect(context.destination)

    // Stop beat when voice ends
    voiceSource.onended = () => {
      try {
        beatSource.stop()
      } catch (e) {
        // Already stopped
      }
      setIsPlaying(false)
    }

    // Start both sources simultaneously
    const startTime = context.currentTime
    voiceSource.start(startTime)
    beatSource.start(startTime)

    sourceNodeRef.current = voiceSource
    beatSourceNodeRef.current = beatSource
    gainNodeRef.current = masterGain
    setIsPlaying(true)
  }

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      sourceNodeRef.current = null
    }
    if (beatSourceNodeRef.current) {
      try {
        beatSourceNodeRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      beatSourceNodeRef.current = null
    }
    setIsPlaying(false)
  }

  // Update playback volume when it changes
  useEffect(() => {
    if (gainNodeRef.current && isPlaying) {
      gainNodeRef.current.gain.value = (playbackVolume / 100) * defaultGainBoost
    }
  }, [playbackVolume, isPlaying])

  return (
    <div className={styles.panel}>
      <h3>Effects Panel</h3>
      
      <div className={styles.effect}>
        <div className={styles.effectHeader}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={autotuneEnabled}
              onChange={(e) => onAutotuneToggle(e.target.checked)}
            />
            <span className={styles.toggleLabel}>Autotune</span>
          </label>
        </div>
        
        {autotuneEnabled && (
          <div className={styles.effectControls}>
            <label className={styles.sliderLabel}>
              Amount: {autotuneAmount}%
              <input
                type="range"
                min="0"
                max="100"
                value={autotuneAmount}
                onChange={(e) => onAutotuneChange(Number(e.target.value))}
                className={styles.slider}
              />
            </label>
            
            <div className={styles.scaleControls}>
              <div className={styles.scaleControl}>
                <label className={styles.selectLabel}>
                  Root Note:
                  <select
                    value={rootNote}
                    onChange={(e) => onRootNoteChange(e.target.value)}
                    className={styles.select}
                  >
                    {noteNames.map(note => (
                      <option key={note} value={note}>{note}</option>
                    ))}
                  </select>
                </label>
              </div>
              
              <div className={styles.scaleControl}>
                <label className={styles.selectLabel}>
                  Scale:
                  <select
                    value={scaleType}
                    onChange={(e) => onScaleTypeChange(e.target.value)}
                    className={styles.select}
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="pentatonic">Pentatonic</option>
                    <option value="minorPentatonic">Minor Pentatonic</option>
                    <option value="dorian">Dorian</option>
                    <option value="mixolydian">Mixolydian</option>
                    <option value="chromatic">Chromatic (All Notes)</option>
                  </select>
                </label>
              </div>
            </div>
            
            <p className={styles.autotuneNote}>
              Tuning to {rootNote} {scaleType === 'major' ? 'Major' : scaleType === 'minor' ? 'Minor' : scaleType === 'pentatonic' ? 'Pentatonic' : scaleType === 'minorPentatonic' ? 'Minor Pentatonic' : scaleType === 'dorian' ? 'Dorian' : scaleType === 'mixolydian' ? 'Mixolydian' : 'Chromatic'} scale
            </p>
          </div>
        )}
      </div>

      <div className={styles.effect}>
        <h4 className={styles.volumeTitle}>Reverb</h4>
        <div className={styles.effectControls}>
          <label className={styles.sliderLabel}>
            Amount: {reverbAmount}%
            <input
              type="range"
              min="0"
              max="100"
              value={reverbAmount}
              onChange={(e) => onReverbChange(Number(e.target.value))}
              className={styles.slider}
            />
          </label>
        </div>
      </div>

      <div className={styles.effect}>
        <h4 className={styles.volumeTitle}>Echo</h4>
        <div className={styles.effectControls}>
          <label className={styles.sliderLabel}>
            Amount: {echoAmount}%
            <input
              type="range"
              min="0"
              max="100"
              value={echoAmount}
              onChange={(e) => onEchoChange(Number(e.target.value))}
              className={styles.slider}
            />
          </label>
        </div>
      </div>

      <div className={styles.effect}>
        <h4 className={styles.volumeTitle}>Playback Volume</h4>
        <div className={styles.volumeControls}>
          <div className={styles.volumeControl}>
            <label className={styles.sliderLabel}>
              🔊 Master: {playbackVolume}%
              <input
                type="range"
                min="0"
                max="100"
                value={playbackVolume}
                onChange={(e) => setPlaybackVolume(Number(e.target.value))}
                className={styles.slider}
              />
            </label>
          </div>
        </div>
        <p className={styles.note}>
          Adjust recording levels before recording to control beat vs voice balance. 
          This control adjusts overall playback volume.
        </p>
      </div>

      {isProcessing && (
        <div className={styles.processingIndicator}>
          <div className={styles.spinner}></div>
          <div className={styles.processingText}>
            <p>Processing autotune...</p>
            <p className={styles.progressText}>{Math.round(processingProgress)}%</p>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className={styles.playback}>
        <button
          onClick={isPlaying ? stopAudio : playAudio}
          className={`${styles.playButton} ${isPlaying ? styles.stopButton : ''}`}
          disabled={isProcessing}
        >
          {isProcessing ? '⏳ Processing...' : isPlaying ? '⏹ Stop' : '▶ Play with Effects'}
        </button>
      </div>

      {audioBuffer && (
        <div className={styles.visualizationContainer}>
          <PitchVisualization
            pitchData={pitchData}
            duration={audioBuffer.duration}
          />
        </div>
      )}
    </div>
  )
}

