'use client'

import { useState, useRef, useEffect } from 'react'
import BeatUploader from '@/components/BeatUploader'
import RecordingStudio from '@/components/RecordingStudio'
import styles from './page.module.css'

export default function Home() {
  const [beatFile, setBeatFile] = useState<File | null>(null)
  const [beatUrl, setBeatUrl] = useState<string | null>(null)
  const [isDefaultBeat, setIsDefaultBeat] = useState(false)

  const handleBeatUpload = (file: File) => {
    setBeatFile(file)
    setIsDefaultBeat(false)
    const url = URL.createObjectURL(file)
    setBeatUrl(url)
  }

  const handleUseDefaultBeat = async () => {
    try {
      const defaultBeatUrl = '/rap-beat-beats-music-444108.mp3'
      // Fetch the file to create a File object
      const response = await fetch(defaultBeatUrl)
      const blob = await response.blob()
      const file = new File([blob], 'rap-beat-beats-music-444108.mp3', { type: 'audio/mpeg' })
      setBeatFile(file)
      setIsDefaultBeat(true)
      setBeatUrl(defaultBeatUrl)
    } catch (error) {
      console.error('Error loading default beat:', error)
      alert('Failed to load default beat. Please try uploading your own.')
    }
  }

  const handleReset = () => {
    if (beatUrl && !isDefaultBeat) {
      URL.revokeObjectURL(beatUrl)
    }
    setBeatFile(null)
    setBeatUrl(null)
    setIsDefaultBeat(false)
  }

  useEffect(() => {
    return () => {
      if (beatUrl) {
        URL.revokeObjectURL(beatUrl)
      }
    }
  }, [beatUrl])

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>TUNES</h1>
      <p className={styles.subtitle}>Music Recording Studio</p>
      
      {!beatFile ? (
        <BeatUploader onUpload={handleBeatUpload} onUseDefaultBeat={handleUseDefaultBeat} />
      ) : (
        <RecordingStudio 
          beatFile={beatFile}
          beatUrl={beatUrl!}
          onReset={handleReset}
        />
      )}
    </main>
  )
}

