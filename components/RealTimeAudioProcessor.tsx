'use client'

import { useRef, useEffect } from 'react'

interface RealTimeAudioProcessorProps {
  beatUrl: string
  isRecording: boolean
  beatVolume: number
  voiceVolume: number
  onRecordingComplete: (voiceBuffer: AudioBuffer, beatBuffer: AudioBuffer, duration: number) => void
}

export default function RealTimeAudioProcessor({
  beatUrl,
  isRecording,
  beatVolume,
  voiceVolume,
  onRecordingComplete,
}: RealTimeAudioProcessorProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const beatSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const beatGainNodeRef = useRef<GainNode | null>(null)
  const beatBufferRef = useRef<AudioBuffer | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const voiceProcessorRef = useRef<AudioWorkletNode | null>(null)
  const beatProcessorRef = useRef<AudioWorkletNode | null>(null)
  const workletLoadedRef = useRef<boolean>(false)
  const voiceSamplesRef = useRef<Float32Array[]>([])
  const beatSamplesRef = useRef<Float32Array[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const recordingDurationRef = useRef<number>(0)

  // Initialize audio context and load beat
  useEffect(() => {
    const initAudio = async () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = context

        // Load beat audio buffer
        const response = await fetch(beatUrl)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = await context.decodeAudioData(arrayBuffer)
        beatBufferRef.current = buffer
      } catch (error) {
        console.error('Error initializing audio:', error)
      }
    }

    initAudio()

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [beatUrl])


  // Store callback in ref to avoid dependency issues
  const onRecordingCompleteRef = useRef(onRecordingComplete)
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete
  }, [onRecordingComplete])

  // Start/stop recording
  useEffect(() => {
    if (!audioContextRef.current || !beatBufferRef.current) return

    const context = audioContextRef.current

    if (isRecording) {
      const startRecording = async () => {
        try {
          // Resume context if suspended
          if (context.state === 'suspended') {
            await context.resume()
          }

          // Get microphone stream with optimal quality settings
          const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false, // Disable to preserve natural sound
              noiseSuppression: false, // Disable to avoid muffling
              autoGainControl: false, // Disable to avoid compression artifacts
              sampleRate: 48000, // Higher sample rate for better quality
              channelCount: 1
            }
          })
          micStreamRef.current = micStream

          // Create microphone source
          const micSource = context.createMediaStreamSource(micStream)
          micSourceRef.current = micSource

          // Create gain nodes
          const micGain = context.createGain()
          const beatGain = context.createGain()
          gainNodeRef.current = micGain
          beatGainNodeRef.current = beatGain

          // Set gain levels based on volume controls (0-100 -> 0.0-1.0)
          micGain.gain.value = voiceVolume / 100
          beatGain.gain.value = beatVolume / 100

          // Reset sample arrays
          voiceSamplesRef.current = []
          beatSamplesRef.current = []
          recordingStartTimeRef.current = context.currentTime

          // Create AudioWorkletNodes to capture audio data separately
          let voiceProcessor: AudioWorkletNode | AudioNode
          let beatProcessor: AudioWorkletNode | AudioNode

          if (workletLoadedRef.current) {
            try {
              // Create AudioWorklet nodes
              const voiceWorklet = new AudioWorkletNode(context, 'audio-recorder-processor')
              const beatWorklet = new AudioWorkletNode(context, 'audio-recorder-processor')

              // Handle messages from worklet processors
              voiceWorklet.port.onmessage = (e) => {
                if (e.data.type === 'samples') {
                  voiceSamplesRef.current.push(e.data.samples)
                }
              }

              beatWorklet.port.onmessage = (e) => {
                if (e.data.type === 'samples') {
                  beatSamplesRef.current.push(e.data.samples)
                }
              }

              voiceProcessor = voiceWorklet
              beatProcessor = beatWorklet
              voiceProcessorRef.current = voiceWorklet
              beatProcessorRef.current = beatWorklet
            } catch (error) {
              console.error('Error creating AudioWorklet nodes:', error)
              // Fallback: use ScriptProcessorNode if AudioWorklet fails
              const bufferSize = 4096
              const voiceScriptProcessor = context.createScriptProcessor(bufferSize, 1, 1) as any
              const beatScriptProcessor = context.createScriptProcessor(bufferSize, 1, 1) as any
              
              voiceScriptProcessor.onaudioprocess = (e: any) => {
                const inputData = e.inputBuffer.getChannelData(0)
                const outputData = e.outputBuffer.getChannelData(0)
                voiceSamplesRef.current.push(new Float32Array(inputData))
                outputData.set(inputData)
              }

              beatScriptProcessor.onaudioprocess = (e: any) => {
                const inputData = e.inputBuffer.getChannelData(0)
                const outputData = e.outputBuffer.getChannelData(0)
                beatSamplesRef.current.push(new Float32Array(inputData))
                outputData.set(inputData)
              }

              voiceProcessor = voiceScriptProcessor
              beatProcessor = beatScriptProcessor
              voiceProcessorRef.current = voiceScriptProcessor as any
              beatProcessorRef.current = beatScriptProcessor as any
            }
          } else {
            // Fallback: use ScriptProcessorNode if AudioWorklet is not available
            const bufferSize = 4096
            const voiceScriptProcessor = context.createScriptProcessor(bufferSize, 1, 1) as any
            const beatScriptProcessor = context.createScriptProcessor(bufferSize, 1, 1) as any
            
            voiceScriptProcessor.onaudioprocess = (e: any) => {
              const inputData = e.inputBuffer.getChannelData(0)
              const outputData = e.outputBuffer.getChannelData(0)
              voiceSamplesRef.current.push(new Float32Array(inputData))
              outputData.set(inputData)
            }

            beatScriptProcessor.onaudioprocess = (e: any) => {
              const inputData = e.inputBuffer.getChannelData(0)
              const outputData = e.outputBuffer.getChannelData(0)
              beatSamplesRef.current.push(new Float32Array(inputData))
              outputData.set(inputData)
            }

            voiceProcessor = voiceScriptProcessor
            beatProcessor = beatScriptProcessor
            voiceProcessorRef.current = voiceScriptProcessor as any
            beatProcessorRef.current = beatScriptProcessor as any
          }

          // Connect microphone -> gain -> processor (for recording only, no monitoring)
          micSource.connect(micGain)
          micGain.connect(voiceProcessor)
          // Don't connect voiceProcessor output - user doesn't want to hear their voice
          // Create a dummy destination to keep the processor active
          const dummyDestination = context.createGain()
          dummyDestination.gain.value = 0 // Silent
          voiceProcessor.connect(dummyDestination)
          dummyDestination.connect(context.destination) // Required connection, but silent

          // Play beat - loop it
          const beatSource = context.createBufferSource()
          beatSource.buffer = beatBufferRef.current
          beatSource.loop = true
          beatSourceRef.current = beatSource

          // Connect beat -> gain -> processor -> destination
          beatSource.connect(beatGain)
          beatGain.connect(beatProcessor)
          beatProcessor.connect(context.destination) // For headphones monitoring

          // Start recording
          const startTime = context.currentTime + 0.1
          beatSource.start(startTime)
          
          // Store start time for duration calculation
          recordingStartTimeRef.current = startTime
        } catch (error) {
          console.error('Error starting recording:', error)
          alert('Failed to start recording. Please check microphone permissions.')
        }
      }

      startRecording()
    } else {
      // Stop recording and process captured samples
      if (beatSourceRef.current) {
        try {
          beatSourceRef.current.stop()
        } catch (e) {
          // Already stopped
        }
        beatSourceRef.current = null
      }

      // Calculate duration
      const duration = audioContextRef.current ? 
        audioContextRef.current.currentTime - recordingStartTimeRef.current : 0
      recordingDurationRef.current = duration

      // Process captured samples into AudioBuffers
      if (voiceSamplesRef.current.length > 0 && beatSamplesRef.current.length > 0 && audioContextRef.current) {
        const context = audioContextRef.current
        const sampleRate = context.sampleRate
        
        // Calculate total length (use the longer of the two)
        const voiceLength = voiceSamplesRef.current.reduce((sum, arr) => sum + arr.length, 0)
        const beatLength = beatSamplesRef.current.reduce((sum, arr) => sum + arr.length, 0)
        const maxLength = Math.max(voiceLength, beatLength)
        
        // Create voice buffer
        const voiceBuffer = context.createBuffer(1, maxLength, sampleRate)
        const voiceChannel = voiceBuffer.getChannelData(0)
        let voiceOffset = 0
        for (const samples of voiceSamplesRef.current) {
          voiceChannel.set(samples, voiceOffset)
          voiceOffset += samples.length
        }
        
        // Create beat buffer (loop it to match voice length)
        const beatBuffer = context.createBuffer(1, maxLength, sampleRate)
        const beatChannel = beatBuffer.getChannelData(0)
        const originalBeatLength = beatBufferRef.current!.length
        let beatOffset = 0
        let beatSampleIndex = 0
        
        while (beatOffset < maxLength) {
          const remaining = maxLength - beatOffset
          const toCopy = Math.min(remaining, originalBeatLength - beatSampleIndex)
          const originalBeatChannel = beatBufferRef.current!.getChannelData(0)
          
          for (let i = 0; i < toCopy; i++) {
            beatChannel[beatOffset + i] = originalBeatChannel[beatSampleIndex + i]
          }
          
          beatOffset += toCopy
          beatSampleIndex = (beatSampleIndex + toCopy) % originalBeatLength
        }
        
        // Call completion callback with separate buffers
        onRecordingCompleteRef.current(voiceBuffer, beatBuffer, duration)
      }

      // Disconnect nodes
      if (voiceProcessorRef.current) {
        voiceProcessorRef.current.disconnect()
        voiceProcessorRef.current = null
      }
      
      if (beatProcessorRef.current) {
        beatProcessorRef.current.disconnect()
        beatProcessorRef.current = null
      }

      if (micSourceRef.current) {
        micSourceRef.current.disconnect()
        micSourceRef.current = null
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect()
        gainNodeRef.current = null
      }

      if (beatGainNodeRef.current) {
        beatGainNodeRef.current.disconnect()
        beatGainNodeRef.current = null
      }

      // Stop microphone stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
      }
    }
  }, [isRecording, beatVolume, voiceVolume])

  // Update gain levels when volumes change (works during recording too)
  useEffect(() => {
    if (!audioContextRef.current) return
    
    const currentTime = audioContextRef.current.currentTime
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(voiceVolume / 100, currentTime)
    }
    if (beatGainNodeRef.current) {
      beatGainNodeRef.current.gain.setValueAtTime(beatVolume / 100, currentTime)
    }
  }, [beatVolume, voiceVolume])

  return null // This component doesn't render anything
}

