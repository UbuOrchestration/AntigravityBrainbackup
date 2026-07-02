const fs = require('fs');
const path = require('path');

// WAV header creator
function createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample) {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;
  
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

// Note frequencies (cozy synth-pop minor key)
// Scale: C Minor (C, D, Eb, F, G, Ab, Bb)
const FREQS = {
  // Bass roots
  'C2': 65.41, 'Ab2': 103.83, 'F2': 87.31, 'G2': 98.00,
  // Pads chords
  'C3': 130.81, 'Eb3': 155.56, 'G3': 196.00, 'Bb3': 233.08, 'D4': 293.66,
  'Ab3': 207.65, 'C4': 261.63,
  'F3': 174.61, 'F4': 349.23,
  'B3': 246.94, 'D3': 146.83,
  // Melody notes (C Minor Pentatonic: C, Eb, F, G, Bb, C, Eb, F...)
  'mel': [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99, 932.33]
};

// Chord notes configuration for progressions
const CHORDS = [
  {
    name: 'Cm7',
    root: FREQS['C2'],
    voices: [FREQS['C3'], FREQS['Eb3'], FREQS['G3'], FREQS['Bb3'], FREQS['D4']],
    melodyScale: [261.63, 311.13, 392.00, 466.16, 523.25] // C, Eb, G, Bb
  },
  {
    name: 'Abmaj7',
    root: FREQS['Ab2'],
    voices: [FREQS['Ab2'], FREQS['C3'], FREQS['Eb3'], FREQS['G3'], FREQS['C4']],
    melodyScale: [207.65, 261.63, 311.13, 392.00, 523.25] // Ab, C, Eb, G
  },
  {
    name: 'Fm9',
    root: FREQS['F2'],
    voices: [FREQS['F2'], FREQS['Ab3'], FREQS['C3'], FREQS['Eb3'], FREQS['G3']],
    melodyScale: [174.61, 207.65, 261.63, 311.13, 392.00] // F, Ab, C, Eb, G
  },
  {
    name: 'G7alt',
    root: FREQS['G2'],
    voices: [FREQS['G2'], FREQS['B3'], FREQS['D3'], FREQS['F3'], FREQS['Bb3']],
    melodyScale: [196.00, 246.94, 293.66, 349.23, 466.16] // G, B, D, F, Bb
  }
];

function generateLofiTrack(outputPath, durationSeconds = 120, bpm = 75, mood = 'cozy') {
  console.log(`Starting synthesis: duration=${durationSeconds}s, BPM=${bpm}, mood=${mood}, output=${outputPath}`);
  
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  
  const header = createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample);
  
  // Timing parameters
  const beatLen = (60 / bpm) * sampleRate; // Samples per beat
  const chordLen = beatLen * 8; // 8 beats per chord progression
  
  // Waveform state tracking
  let t = 0;
  const buffer = Buffer.alloc(numSamples * 4); // 4 bytes per sample (16-bit stereo)
  
  // Delay/Echo line buffer (Stereo)
  const delayTimeL = Math.floor(sampleRate * 0.35); // 350ms delay
  const delayTimeR = Math.floor(sampleRate * 0.45); // 450ms delay
  const delayBufferL = new Float32Array(delayTimeL);
  const delayBufferR = new Float32Array(delayTimeR);
  let delayIdxL = 0;
  let delayIdxR = 0;
  const delayFeedback = 0.45;
  
  // Low-pass filter state
  let lpL = 0, lpR = 0;
  const filterAlpha = 0.12; // Muffled lofi filter
  
  // Vinyl crackle state
  let crackleTime = 0;
  let crackleAmp = 0;
  
  // Melody generator timing
  let lastMelodyTrigger = 0;
  let melodyNoteFreq = 0;
  let melodyDuration = 0;
  let melodyEnv = 0;
  
  // Rain ambiance filter state
  let rainLp = 0;
  
  for (let s = 0; s < numSamples; s++) {
    // 1. Determine active chord
    const chordIndex = Math.floor(s / chordLen) % CHORDS.length;
    const chord = CHORDS[chordIndex];
    
    // Smooth transition between chords (crossfade envelope)
    const chordAge = s % chordLen;
    const attackLen = sampleRate * 1.5; // 1.5s fade-in
    const releaseLen = sampleRate * 1.5; // 1.5s fade-out
    let chordVolume = 1.0;
    if (chordAge < attackLen) {
      chordVolume = chordAge / attackLen;
    } else if (chordAge > chordLen - releaseLen) {
      chordVolume = (chordLen - chordAge) / releaseLen;
    }
    
    // 2. Synthesize Pad Chords (Warm analog detuned waves)
    let padSample = 0;
    for (let i = 0; i < chord.voices.length; i++) {
      const freq = chord.voices[i];
      // Oscillator 1: Sine
      const phase1 = 2 * Math.PI * freq * (s / sampleRate);
      // Oscillator 2: Slightly detuned triangle wave for warm chorus/detune vibe
      const phase2 = 2 * Math.PI * (freq * 1.006) * (s / sampleRate);
      
      const osc1 = Math.sin(phase1);
      // Triangle wave synthesis: (2/PI) * arcsin(sin(phase))
      const osc2 = (2 / Math.PI) * Math.asin(Math.sin(phase2));
      
      padSample += (osc1 * 0.6 + osc2 * 0.4);
    }
    padSample = (padSample / chord.voices.length) * 0.28 * chordVolume;
    
    // 3. Synthesize Sub Bass (Deep pure sine)
    const bassPhase = 2 * Math.PI * chord.root * (s / sampleRate);
    const bassSample = Math.sin(bassPhase) * 0.25 * chordVolume;
    
    // 4. Synthesize Melody (Muted retro bell)
    // Trigger a melody note every 4 beats with 65% probability
    const melodyInterval = beatLen * 2;
    if (s - lastMelodyTrigger > melodyInterval) {
      lastMelodyTrigger = s;
      if (Math.random() < 0.65) {
        // Pick a random note from active chord's pentatonic scale
        const notes = chord.melodyScale;
        melodyNoteFreq = notes[Math.floor(Math.random() * notes.length)];
        melodyDuration = sampleRate * (1.0 + Math.random() * 2.0); // 1-3 seconds note
        melodyEnv = 1.0;
      } else {
        melodyNoteFreq = 0; // rest
      }
    }
    
    let melodySample = 0;
    if (melodyNoteFreq > 0 && melodyEnv > 0) {
      const melPhase = 2 * Math.PI * melodyNoteFreq * (s / sampleRate);
      // Bell wave: Sine wave + mild high harmonic
      melodySample = (Math.sin(melPhase) + 0.2 * Math.sin(melPhase * 2)) * 0.12 * melodyEnv;
      // Decay envelope
      melodyEnv -= 1.0 / melodyDuration;
    }
    
    // Apply stereo delay line to the melody
    const delayedL = delayBufferL[delayIdxL];
    const delayedR = delayBufferR[delayIdxR];
    
    // Save to delay buffers with feedback
    delayBufferL[delayIdxL] = melodySample + delayedR * delayFeedback;
    delayBufferR[delayIdxR] = melodySample + delayedL * delayFeedback;
    
    // Advance index
    delayIdxL = (delayIdxL + 1) % delayTimeL;
    delayIdxR = (delayIdxR + 1) % delayTimeR;
    
    // Combined melody with delay
    const melOutL = melodySample + delayedL * 0.6;
    const melOutR = melodySample + delayedR * 0.6;
    
    // 5. Generate Vinyl Crackle & Soft Rain Ambiance
    // Soft Rain: Muffled white noise
    const whiteNoise = Math.random() * 2.0 - 1.0;
    // Modulate rain filter slightly to simulate dynamic sweeps (wind)
    const rainSweep = 0.04 + 0.02 * Math.sin(2 * Math.PI * 0.04 * (s / sampleRate));
    rainLp = rainLp + (whiteNoise - rainLp) * rainSweep;
    const rainAmbiance = rainLp * 0.055;
    
    // Vinyl crackle trigger
    if (Math.random() < 0.00035 && crackleAmp === 0) {
      crackleAmp = 0.45 + Math.random() * 0.4;
      crackleTime = 0;
    }
    let vinylPop = 0;
    if (crackleAmp > 0) {
      // Rapid impulse click
      vinylPop = (Math.random() * 2.0 - 1.0) * crackleAmp;
      crackleAmp *= 0.95; // Quick decay
      if (crackleAmp < 0.001) crackleAmp = 0;
    }
    const vinylAmbiance = (whiteNoise * 0.015) + (vinylPop * 0.08);
    
    // 6. Master Mix
    let mixL = padSample + bassSample + melOutL + rainAmbiance + vinylAmbiance;
    let mixR = padSample + bassSample + melOutR + rainAmbiance + vinylAmbiance;
    
    // Lowpass filter master out for the vintage muffle
    lpL = lpL + (mixL - lpL) * filterAlpha;
    lpR = lpR + (mixR - lpR) * filterAlpha;
    
    // Hard clipping safety check
    let outL = Math.max(-1.0, Math.min(1.0, lpL));
    let outR = Math.max(-1.0, Math.min(1.0, lpR));
    
    // Convert float to 16-bit signed integer
    const sampleIntL = Math.floor(outL * 32767);
    const sampleIntR = Math.floor(outR * 32767);
    
    const offset = s * 4;
    buffer.writeInt16LE(sampleIntL, offset);
    buffer.writeInt16LE(sampleIntR, offset + 2);
  }
  
  // Write the file output
  const fd = fs.openSync(outputPath, 'w');
  fs.writeSync(fd, header, 0, header.length);
  fs.writeSync(fd, buffer, 0, buffer.length);
  fs.closeSync(fd);
  console.log(`Synthesis complete. Saved to ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
}

// CLI Executor
if (require.main === module) {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const duration = isTest ? 15 : 120; // 15s test or 2m default
  const outPath = isTest ? path.join(__dirname, 'test_output.wav') : path.join(__dirname, 'output.wav');
  
  generateLofiTrack(outPath, duration, 72, 'cozy');
}

module.exports = { generateLofiTrack };
