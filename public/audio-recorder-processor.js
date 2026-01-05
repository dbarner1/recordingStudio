// AudioWorklet processor for recording audio samples
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = []
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    
    if (input && input.length > 0 && input[0].length > 0) {
      // Copy the input channel data
      const channelData = input[0]
      const samplesCopy = new Float32Array(channelData.length)
      samplesCopy.set(channelData)
      
      // Send samples to main thread
      this.port.postMessage({
        type: 'samples',
        samples: samplesCopy
      })
    }
    
    // Pass through audio
    const output = outputs[0]
    if (output && output.length > 0 && input && input.length > 0) {
      output[0].set(input[0])
    }
    
    return true
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor)

