'use client'

import { useRef, useEffect } from 'react'

interface RealTimeAudioProcessorProps {
  beatUrl: string
  isRecording: boolean
  beatVolume: number
  voiceVolume: number
  onRecordingComplete: (audioBlob: Blob) => void
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const beatBufferRef = useRef<AudioBuffer | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const recordingStreamRef = useRef<MediaStreamAudioDestinationNode | null>(null)

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
              channelCount: 1,
              latency: 0 // Request lowest latency
            }
          })
          micStreamRef.current = micStream

          // Create microphone source
          const micSource = context.createMediaStreamSource(micStream)
          micSourceRef.current = micSource

          // Create destination for recording
          const recordingDestination = context.createMediaStreamDestination()
          recordingStreamRef.current = recordingDestination

          // Create gain nodes
          const micGain = context.createGain()
          const beatGain = context.createGain()
          gainNodeRef.current = micGain
          beatGainNodeRef.current = beatGain

          // Set gain levels based on volume controls (0-100 -> 0.0-1.0)
          micGain.gain.value = voiceVolume / 100
          beatGain.gain.value = beatVolume / 100

          // Connect microphone directly -> gain -> recording only (no compressor, no effects)
          // Record completely clean audio without any processing that could cause muffling
          micSource.connect(micGain)
          micGain.connect(recordingDestination) // Direct connection for cleanest recording

          // Record the mixed audio with better quality settings
          const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/webm;codecs=pcm'
          ]
          
          let selectedMimeType = ''
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType
              break
            }
          }

          const mediaRecorderOptions: MediaRecorderOptions = selectedMimeType 
            ? { mimeType: selectedMimeType }
            : {}

          const mediaRecorder = new MediaRecorder(recordingDestination.stream, mediaRecorderOptions)
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }

          mediaRecorder.onstop = () => {
            // Ensure we have all chunks
            if (audioChunksRef.current.length > 0) {
              const mimeType = selectedMimeType || 'audio/webm'
              const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
              onRecordingComplete(audioBlob)
            }
            audioChunksRef.current = []
          }

          mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event)
          }

          // Play beat - no delay needed since we're not processing the mic
          const beatSource = context.createBufferSource()
          beatSource.buffer = beatBufferRef.current
          beatSource.loop = true
          beatSourceRef.current = beatSource

          // Connect beat directly
          beatSource.connect(beatGain)
          beatGain.connect(recordingDestination) // For recording
          beatGain.connect(context.destination) // For headphones monitoring

          // Ensure perfect synchronization: start MediaRecorder and beat at the exact same time
          // Use AudioContext's precise timing to start everything synchronized
          const startTime = context.currentTime + 0.1 // Small buffer to ensure everything is ready
          
          // Start MediaRecorder without timeslice for smoother, less choppy recording
          // Timeslice can cause choppiness, so we'll capture continuously
          mediaRecorder.start()
          
          // Start beat at the same time - this ensures both mic and beat are recorded in sync
          beatSource.start(startTime)
        } catch (error) {
          console.error('Error starting recording:', error)
          alert('Failed to start recording. Please check microphone permissions.')
        }
      }

      startRecording()
    } else {
      // Stop recording properly
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          // Request final data before stopping
          mediaRecorderRef.current.requestData()
          mediaRecorderRef.current.stop()
        } else if (mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.stop()
        }
      }

      // Stop beat
      if (beatSourceRef.current) {
        try {
          beatSourceRef.current.stop()
        } catch (e) {
          // Already stopped
        }
        beatSourceRef.current = null
      }

      // Disconnect nodes
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

    return () => {
      // Cleanup on unmount or dependency change
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData()
          mediaRecorderRef.current.stop()
        }
      }
    }
  }, [isRecording, beatVolume, voiceVolume, onRecordingComplete])

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

