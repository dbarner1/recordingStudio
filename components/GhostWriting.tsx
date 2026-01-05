'use client'

import { useState, useEffect } from 'react'
import styles from './GhostWriting.module.css'

// Better rhyme detection - extract the vowel sound and following consonants
const getRhymeSound = (word: string): string => {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '')
  if (lower.length === 0) return ''
  
  // Find the last vowel and everything after it
  const vowels = 'aeiou'
  let lastVowelIndex = -1
  
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      lastVowelIndex = i
      break
    }
  }
  
  if (lastVowelIndex >= 0) {
    // Return from the last vowel to the end (includes vowel + trailing consonants)
    return lower.slice(lastVowelIndex)
  }
  
  // If no vowel found, return last 2-3 characters
  return lower.length >= 3 ? lower.slice(-3) : lower.slice(-2)
}

// Check if two words rhyme (more lenient matching)
const wordsRhyme = (word1: string, word2: string): boolean => {
  const rhyme1 = getRhymeSound(word1)
  const rhyme2 = getRhymeSound(word2)
  
  if (rhyme1.length === 0 || rhyme2.length === 0) return false
  
  // Exact match
  if (rhyme1 === rhyme2) return true
  
  // Check if they share the same ending (at least 2 characters)
  const minLength = Math.min(rhyme1.length, rhyme2.length)
  if (minLength >= 2) {
    return rhyme1.slice(-2) === rhyme2.slice(-2)
  }
  
  return false
}

// Multiple sets of bars with different themes and rhyme schemes using sophisticated vocabulary
// Each set of 4 bars follows AABB pattern where the last words actually rhyme
const allBarSets = [
  // Set 1: Intellectual dominance - AABB pattern
  [
    ["Articulating with precision, linguistic division", "Every syllable's decision, creating a vision", "Cognitive revision, strategic provision", "Verbal precision, making the incision"],
    ["Constructing my empire, never been confined", "Every verse refined, intellectually aligned", "The fire inside, intellectually combined", "Reaching heights undefined, mentally designed"],
    ["Sovereign of this domain, that's my proclamation", "Every composition, a unique manifestation", "Recognition and reputation, my occupation", "They understand the causation, my demonstration"],
    ["Dismantling barriers, responding to inquiries", "Elevated position, no need for worries", "Complete acquisition, ready for hostilities", "That's my methodology, giving my capabilities"]
  ],
  // Set 2: Sophisticated street narrative - AABB pattern
  [
    ["Originating from the thoroughfares, where authenticity meets", "Thermal intensity in my lexicon, cannot be beat", "Rhythmic locomotion, my designated seat", "Creating historical significance, cannot be discrete"],
    ["Initiated from the foundation, now at the apex", "Continuous progression, controlling the complex", "Every single release, causing cranial reflex", "Possessing the mechanisms, observe my annex"],
    ["They perceive my approach, comprehending the situation", "Flow so fluid, saturating the container", "Never surrendering, ascending elevation", "Possessing fortune, generating my own creation"],
    ["This is my temporal moment, this is my chronology", "Every linguistic construction, making it my property", "Possessing the blueprint, making it quality", "Transcending boundaries, making it luminosity"]
  ],
  // Set 3: Elevated success narrative - AABB pattern
  [
    ["Transformed from insignificance, now I'm defeating", "Financial resources accumulating, never retreating", "Originated from the foundation, now I'm captivating", "Causing universal curiosity, what I'm creating"],
    ["Possessing clarity of vision, experiencing no trepidation", "Executing strategic movements, making my declaration", "Possessing the concept, causing it to materialize", "Possessing the profession, making it crystallize"],
    ["They expressed impossibility, yet I accomplished", "Obtained the opportunity, making it expanded", "Obtained the framework, making it enhanced", "Obtained the closure, making it advanced"],
    ["This is my chronicle, this is my evidence", "Possessing the classification, making it evidence", "Possessing the catalog, making it present", "Possessing the domain, making it present"]
  ],
  // Set 4: Intellectual authority - AABB pattern
  [
    ["I'm the subject of discussion, possessing influence", "Possessing the pathway, causing them uncertainty", "Possessing the exclamation, causing them discontent", "Possessing the reconnaissance, making them investigate"],
    ["Possessing authority in my vocalization, creating the selection", "Possessing the sound, causing them celebration", "Possessing the composure, making them expression", "Possessing the instruments, making them expression"],
    ["I'm the one they dread, possessing the equipment", "Possessing the clarity, making them perception", "Possessing the proximity, making them emotion", "Possessing the value, making them elation"],
    ["Possessing the diadem upon my cranium, causing them apprehension", "Possessing the filament, making them expansion", "Possessing the sustenance, making them consumption", "Possessing the guidance, making them direction"]
  ],
  // Set 5: Sophisticated perseverance - AABB pattern
  [
    ["Possessing determination in my circulation, causing inundation", "Possessing the sediment, making it excellence", "Possessing the excellence, making it necessity", "Possessing the failure, making it possibility"],
    ["Laboring diurnally and nocturnally, possessing illumination", "Possessing the conflict, making it correctness", "Possessing the perception, making it radiance", "Possessing the tension, making it potential"],
    ["Possessing the perseverance, possessing the intellect", "Possessing the variety, making them discovery", "Possessing the connection, making them rotation", "Possessing the exterior, making them cognition"],
    ["Possessing the strategy, possessing the individual", "Possessing the container, making them enthusiast", "Possessing the vessel, making them movement", "Possessing the pigmentation, making them arrangement"]
  ],
  // Set 6: Elevated aspirations - AABB pattern
  [
    ["Pursuing all my aspirations, possessing the strategies", "Possessing the collectives, making them radiance", "Possessing the appearance, making them abundance", "Possessing the currents, making them aspirations"],
    ["Possessing the perception, possessing the objective", "Possessing the division, making them attention", "Possessing the state, making them location", "Possessing the inclusion, making them transformation"],
    ["Possessing the objective, possessing the essence", "Possessing the carbon, making them completeness", "Possessing the function, making them payment", "Possessing the support, making them scrolling"],
    ["Possessing the intention, possessing the designation", "Possessing the activity, making them combustion", "Possessing the recognition, making them similarity", "Possessing the structure, making them assertion"]
  ]
]

// Generate intelligent rap bars with rhyme schemes
const generateBars = (): string[] => {
  // Randomly select one set of bars
  const randomSet = allBarSets[Math.floor(Math.random() * allBarSets.length)]
  return randomSet.flat()
}

interface BarWithRhymes {
  text: string
  endRhyme: string
  internalRhymes: number[]
}

interface GhostWritingProps {
  isRecording?: boolean
}

const analyzeRhymes = (bars: string[]): BarWithRhymes[] => {
  return bars.map((bar, index) => {
    const words = bar.split(' ').map(w => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(w => w.length > 0)
    const lastWord = words[words.length - 1]
    const endRhyme = getRhymeSound(lastWord)
    
    // Find internal rhymes (words that rhyme with the end word)
    const internalRhymes: number[] = []
    words.forEach((word, wordIndex) => {
      if (wordIndex < words.length - 1 && wordsRhyme(word, lastWord)) {
        internalRhymes.push(wordIndex)
      }
    })
    
    return {
      text: bar,
      endRhyme,
      internalRhymes
    }
  })
}

export default function GhostWriting({ isRecording = false }: GhostWritingProps) {
  const [bars, setBars] = useState<BarWithRhymes[]>([])
  const [currentBar, setCurrentBar] = useState<number | null>(null)

  useEffect(() => {
    const generatedBars = generateBars()
    const analyzedBars = analyzeRhymes(generatedBars)
    setBars(analyzedBars)
  }, [])

  // Highlight current bar during recording (based on time)
  useEffect(() => {
    if (isRecording && bars.length > 0) {
      // This could be enhanced to track actual recording time
      // For now, we'll just keep the current bar highlighting
    }
  }, [isRecording, bars])

  const highlightRhymes = (bar: BarWithRhymes, barIndex: number): JSX.Element => {
    const words = bar.text.split(' ')
    const cleanWords = words.map(w => w.replace(/[^a-z]/gi, '').toLowerCase()).filter(w => w.length > 0)
    const lastWordIndex = words.length - 1
    const lastCleanWord = cleanWords[cleanWords.length - 1]
    
    // Find which words in the original text correspond to internal rhymes
    let cleanWordIndex = 0
    
    return (
      <span>
        {words.map((word, wordIndex) => {
          const cleanWord = word.replace(/[^a-z]/gi, '').toLowerCase()
          const isEndRhyme = wordIndex === lastWordIndex
          const isInternalRhyme = cleanWord.length > 0 && cleanWordIndex < cleanWords.length - 1 && 
                                  wordsRhyme(cleanWord, lastCleanWord)
          
          if (cleanWord.length > 0) {
            cleanWordIndex++
          }
          
          let className = styles.word
          if (isEndRhyme) {
            className += ` ${styles.endRhyme}`
          } else if (isInternalRhyme) {
            className += ` ${styles.internalRhyme}`
          }
          
          return (
            <span key={wordIndex} className={className}>
              {word}
              {wordIndex < words.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <div className={`${styles.ghostWriting} ${isRecording ? styles.recording : ''}`}>
      <h4 className={styles.title}>16 Bars - Ghost Written</h4>
      <div className={styles.barsContainer}>
        {bars.map((bar, index) => (
          <div 
            key={index} 
            className={`${styles.bar} ${currentBar === index ? styles.activeBar : ''}`}
            onClick={() => !isRecording && setCurrentBar(currentBar === index ? null : index)}
          >
            <span className={styles.barNumber}>{index + 1}</span>
            <span className={styles.barText}>
              {highlightRhymes(bar, index)}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.endRhyme}`}></span>
          End Rhyme
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.internalRhyme}`}></span>
          Internal Rhyme
        </span>
      </div>
    </div>
  )
}
