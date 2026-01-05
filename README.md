# TUNES - Music Recording Studio

A Next.js application for recording music with beats and effects.

## Features

- **Beat Upload**: Upload your own beat files (MP3, WAV, OGG, M4A)
- **Voice Recording**: Record your voice while listening to the beat
- **Autotune Effect**: Apply autotune to your recorded voice with adjustable intensity

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload a beat file by clicking or dragging and dropping an audio file
2. Click "Start Recording" to begin recording your voice (the beat will play automatically)
3. Click "Stop Recording" when finished
4. Use the Effects Panel to enable autotune and adjust the amount
5. Click "Play with Effects" to hear your recording with effects applied

## Browser Compatibility

This app requires:
- Modern browser with Web Audio API support
- Microphone permissions
- Modern JavaScript features (ES6+)

## Technology Stack

- Next.js 14
- React 18
- TypeScript
- Web Audio API
- MediaRecorder API

