'use client'

import { useState, useRef, useEffect } from 'react'
import BeatUploader from '@/components/BeatUploader'
import RecordingStudio from '@/components/RecordingStudio'
import styles from './page.module.css'

export default function Home() {
  const [beatFile, setBeatFile] = useState<File | null>(null)
  const [beatUrl, setBeatUrl] = useState<string | null>(null)

  const handleBeatUpload = (file: File) => {
    setBeatFile(file)
    const url = URL.createObjectURL(file)
    setBeatUrl(url)
  }

  const handleReset = () => {
    if (beatUrl) {
      URL.revokeObjectURL(beatUrl)
    }
    setBeatFile(null)
    setBeatUrl(null)
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
        <BeatUploader onUpload={handleBeatUpload} />
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

