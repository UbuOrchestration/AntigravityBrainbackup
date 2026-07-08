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

// Epic Trance Chords (F# Minor Progression)
const CHORDS_TRANCE = [
  {
    name: 'F#m',
    root: 92.50, // F#2
    voices: [185.00, 220.00, 277.18, 329.63], // F#3, A3, C#4, E4
    melodyScale: [185.00, 220.00, 277.18, 329.63, 415.30]
  },
  {
    name: 'Dmaj7',
    root: 73.42, // D2
    voices: [146.83, 185.00, 220.00, 277.18], // D3, F#3, A3, C#4
    melodyScale: [146.83, 185.00, 220.00, 277.18, 370.00]
  },
  {
    name: 'Amaj7',
    root: 110.00, // A2
    voices: [220.00, 277.18, 329.63, 415.30], // A3, C#4, E4, G#4
    melodyScale: [220.00, 277.18, 329.63, 415.30, 554.37]
  },
  {
    name: 'E7',
    root: 82.41, // E2
    voices: [164.81, 207.65, 246.94, 293.66], // E3, G#3, B3, D4
    melodyScale: [164.81, 246.94, 293.66, 329.63, 493.88]
  }
];

// Liquid DnB / Atmospheric Jungle Chords (E Minor Progression)
const CHORDS_DNB = [
  {
    name: 'Em9',
    root: 82.41, // E2
    voices: [164.81, 196.00, 246.94, 293.66, 369.99], // E3, G3, B3, D4, F#4
    melodyScale: [329.63, 392.00, 493.88, 587.33, 739.99] // E4, G4, B4, D5, F#5
  },
  {
    name: 'Cmaj9',
    root: 65.41, // C2
    voices: [130.81, 196.00, 246.94, 293.66, 329.63], // C3, G3, B3, D4, E4
    melodyScale: [261.63, 329.63, 392.00, 493.88, 523.25] // C4, E4, G4, B4, C5
  },
  {
    name: 'Am9',
    root: 55.00, // A1 (deep reese sub)
    voices: [220.00, 261.63, 329.63, 392.00, 493.88], // A3, C4, E4, G4, B4
    melodyScale: [220.00, 261.63, 329.63, 392.00, 440.00] // A3, C4, E4, G4, A4
  },
  {
    name: 'Bm7',
    root: 61.74, // B1
    voices: [123.47, 174.61, 220.00, 293.66, 369.99], // B2, F3, A3, D4, F#4
    melodyScale: [246.94, 293.66, 369.99, 440.00, 493.88] // B3, D4, F#4, A4, B4
  }
];

// Cozy Lofi Chords
const CHORDS_LOFI = [
  {
    name: 'Cm7',
    root: 65.41, // C2
    voices: [130.81, 155.56, 196.00, 233.08, 293.66], // C3, Eb3, G3, Bb3, D4
    melodyScale: [261.63, 311.13, 392.00, 466.16, 523.25]
  },
  {
    name: 'Abmaj7',
    root: 103.83, // Ab2
    voices: [103.83, 130.81, 155.56, 196.00, 261.63], // Ab2, C3, Eb3, G3, C4
    melodyScale: [207.65, 261.63, 311.13, 392.00, 523.25]
  },
  {
    name: 'Fm9',
    root: 87.31, // F2
    voices: [87.31, 207.65, 130.81, 155.56, 196.00], // F2, Ab3, C3, Eb3, G3
    melodyScale: [174.61, 207.65, 261.63, 311.13, 392.00]
  },
  {
    name: 'G7alt',
    root: 98.00, // G2
    voices: [98.00, 246.94, 146.83, 174.61, 233.08], // G2, B3, D3, F3, Bb3
    melodyScale: [196.00, 246.94, 293.66, 349.23, 466.16]
  }
];

function generateLofiTrack(outputPath, durationSeconds = 120, bpm = 75, mood = 'cozy', gains = {}) {
  const isTrance = (mood === 'trance');
  const isDnB = (mood === 'liquiddnb');
  
  // Set defaults or uncap user's custom BPM
  const activeBPM = isDnB ? (bpm === 75 ? 168 : bpm) : (isTrance ? (bpm === 75 ? 136 : bpm) : bpm);
  const chords = isDnB ? CHORDS_DNB : (isTrance ? CHORDS_TRANCE : CHORDS_LOFI);
  
  // Extract gains from mixer
  const padGain = gains.pad !== undefined ? parseFloat(gains.pad) : 1.0;
  const melodyGain = gains.melody !== undefined ? parseFloat(gains.melody) : 1.0;
  const bassGain = gains.bass !== undefined ? parseFloat(gains.bass) : 1.0;
  const drumGain = gains.drum !== undefined ? parseFloat(gains.drum) : 1.0;
  const ambianceGain = gains.ambiance !== undefined ? parseFloat(gains.ambiance) : 1.0;
  
  console.log(`Synthesis: duration=${durationSeconds}s, BPM=${activeBPM}, mood=${mood}, pads=${padGain}, mel=${melodyGain}, bass=${bassGain}, drum=${drumGain}, amb=${ambianceGain}`);
  
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  
  const header = createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample);
  
  const beatLen = (60 / activeBPM) * sampleRate; // Samples per beat
  const chordLen = beatLen * (isTrance ? 16 : (isDnB ? 16 : 8));
  
  const buffer = Buffer.alloc(numSamples * 4); // 16-bit stereo PCM
  
  // Delay/Echo line buffer (Stereo)
  const delayTimeL = Math.floor(sampleRate * (isTrance ? 0.25 : (isDnB ? 0.38 : 0.35)));
  const delayTimeR = Math.floor(sampleRate * (isTrance ? 0.375 : (isDnB ? 0.52 : 0.45)));
  const delayBufferL = new Float32Array(delayTimeL);
  const delayBufferR = new Float32Array(delayTimeR);
  let delayIdxL = 0;
  let delayIdxR = 0;
  const delayFeedback = isTrance ? 0.65 : (isDnB ? 0.58 : 0.45);
  
  // Low-pass filter state
  let lpL = 0, lpR = 0;
  const filterAlpha = isTrance ? 0.35 : (isDnB ? 0.30 : 0.12);
  
  // Vinyl crackle state (Lofi)
  let crackleAmp = 0;
  
  // Melody generator timing
  let lastMelodyTrigger = 0;
  let melodyNoteFreq = 0;
  let melodyDuration = 0;
  let melodyEnv = 0;
  
  // Rain ambiance filter state
  let rainLp = 0;
  
  // Drum synthesizer triggers
  let kickTime = -1;
  let kickPhase = 0;
  let snareTime = -1;
  let hatTime = -1;
  
  for (let s = 0; s < numSamples; s++) {
    const chordIndex = Math.floor(s / chordLen) % chords.length;
    const chord = chords[chordIndex];
    
    // Crossfade envelope between chords
    const chordAge = s % chordLen;
    const attackLen = sampleRate * (isTrance || isDnB ? 1.0 : 1.5);
    const releaseLen = sampleRate * (isTrance || isDnB ? 1.0 : 1.5);
    let chordVolume = 1.0;
    if (chordAge < attackLen) {
      chordVolume = chordAge / attackLen;
    } else if (chordAge > chordLen - releaseLen) {
      chordVolume = (chordLen - chordAge) / releaseLen;
    }
    
    // RHYTHMIC DRUMS (Jungle/DnB vs Trance)
    let drumSample = 0;
    
    if (isDnB) {
      // 16th note divisions for Jungle breaks
      const subBeatLen = beatLen / 4;
      const step = Math.floor(s / subBeatLen) % 16;
      
      // Check triggers on steps
      if (s % Math.floor(subBeatLen) === 0) {
        if (step === 0 || step === 6 || step === 10 || step === 14) {
          kickTime = 0;
          kickPhase = 0;
        }
        if (step === 4 || step === 12) {
          snareTime = 0;
        }
        if (step === 2 || step === 8 || step === 10 || step === 15) {
          hatTime = 0;
        }
      }
      
      // Synthesize Kick (swept pitch)
      if (kickTime >= 0) {
        const f = 45 + 120 * Math.exp(-kickTime * 110);
        kickPhase += 2 * Math.PI * f / sampleRate;
        drumSample += Math.sin(kickPhase) * Math.exp(-kickTime * 18) * 0.40;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.3) kickTime = -1;
      }
      // Synthesize Snare (noise burst + punch)
      if (snareTime >= 0) {
        const snareNoise = (Math.random() * 2 - 1) * Math.exp(-snareTime * 35) * 0.35;
        const snarePunch = Math.sin(2 * Math.PI * 180 * snareTime) * Math.exp(-snareTime * 50) * 0.15;
        drumSample += (snareNoise + snarePunch);
        snareTime += 1 / sampleRate;
        if (snareTime > 0.25) snareTime = -1;
      }
      // Synthesize Hi-Hat (crisp short noise)
      if (hatTime >= 0) {
        drumSample += (Math.random() * 2 - 1) * Math.exp(-hatTime * 120) * 0.12;
        hatTime += 1 / sampleRate;
        if (hatTime > 0.08) hatTime = -1;
      }
      drumSample *= drumGain;
      
    } else if (isTrance) {
      // 4/4 Kick on the beat
      if (s % Math.floor(beatLen) === 0) {
        kickTime = 0;
        kickPhase = 0;
      }
      if (kickTime >= 0) {
        const f = 48 + 112 * Math.exp(-kickTime * 85);
        kickPhase += 2 * Math.PI * f / sampleRate;
        drumSample = Math.sin(kickPhase) * Math.exp(-kickTime * 14) * 0.42 * drumGain;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.4) kickTime = -1;
      }
    }
    
    // SYNTH PADS
    let padSample = 0;
    if (isTrance || isDnB) {
      // Slow sweeps for progressive leads / pads
      const sweepFrequency = isDnB ? 0.035 : 0.05;
      const sweepAlpha = 0.18 + 0.16 * Math.sin(2 * Math.PI * sweepFrequency * (s / sampleRate));
      
      for (let i = 0; i < chord.voices.length; i++) {
        const freq = chord.voices[i];
        // detuned saw stack
        const p1 = 2 * Math.PI * (freq * 0.996) * (s / sampleRate);
        const p2 = 2 * Math.PI * freq * (s / sampleRate);
        const p3 = 2 * Math.PI * (freq * 1.004) * (s / sampleRate);
        
        const saw1 = ((p1 / Math.PI) % 2) - 1;
        const saw2 = ((p2 / Math.PI) % 2) - 1;
        const saw3 = ((p3 / Math.PI) % 2) - 1;
        
        padSample += (saw1 + saw2 + saw3) * 0.33;
      }
      // Apply sweep filter simulation to pad
      padSample = (padSample / chord.voices.length) * 0.18 * chordVolume * padGain;
    } else {
      // Soft cozy Lofi Pads
      for (let i = 0; i < chord.voices.length; i++) {
        const freq = chord.voices[i];
        const phase1 = 2 * Math.PI * freq * (s / sampleRate);
        const phase2 = 2 * Math.PI * (freq * 1.006) * (s / sampleRate);
        const osc1 = Math.sin(phase1);
        const osc2 = (2 / Math.PI) * Math.asin(Math.sin(phase2)); // Triangle
        padSample += (osc1 * 0.6 + osc2 * 0.4);
      }
      padSample = (padSample / chord.voices.length) * 0.28 * chordVolume * padGain;
    }
    
    // BASSLINE (Reese wobble for DnB vs Rolling for Trance vs Sub for Lofi)
    let bassSample = 0;
    if (isDnB) {
      // Warm detuned Reese bass with moving filter
      const bassPhase1 = 2 * Math.PI * (chord.root * 0.994) * (s / sampleRate);
      const bassPhase2 = 2 * Math.PI * (chord.root * 1.006) * (s / sampleRate);
      const saw1 = ((bassPhase1 / Math.PI) % 2) - 1;
      const saw2 = ((bassPhase2 / Math.PI) % 2) - 1;
      
      // Moving filter wobble (LFO)
      const wobble = 0.07 + 0.05 * Math.sin(2 * Math.PI * 0.35 * (s / sampleRate));
      const reeseOut = (saw1 * 0.5 + saw2 * 0.5);
      
      // Apply lowpass to Reese
      bassSample = reeseOut * wobble * 0.26 * chordVolume * bassGain;
    } else if (isTrance) {
      // Rolling 16th Bass
      const subBeatLen = beatLen / 4;
      const step = Math.floor(s / subBeatLen) % 4;
      if (step > 0) {
        const stepAge = s % subBeatLen;
        const bassPhase = 2 * Math.PI * chord.root * (s / sampleRate);
        const bassSaw = ((bassPhase / Math.PI) % 2) - 1;
        const bassDecay = Math.exp(-stepAge / (subBeatLen * 0.7));
        bassSample = bassSaw * bassDecay * 0.24 * chordVolume * bassGain;
      }
    } else {
      // Lofi deep Sub Bass
      const bassPhase = 2 * Math.PI * chord.root * (s / sampleRate);
      bassSample = Math.sin(bassPhase) * 0.25 * chordVolume * bassGain;
    }
    
    // MELODY
    const melodyInterval = isDnB ? (beatLen / 2) : (isTrance ? (beatLen / 2) : (beatLen * 2));
    if (s - lastMelodyTrigger > melodyInterval) {
      lastMelodyTrigger = s;
      
      if (isDnB || isTrance) {
        // Sequenced plucks
        const notes = chord.melodyScale;
        const beatIndex = Math.floor(s / melodyInterval) % 8;
        melodyNoteFreq = notes[beatIndex % notes.length];
        melodyDuration = melodyInterval * 1.5;
        melodyEnv = 1.0;
      } else {
        if (Math.random() < 0.65) {
          const notes = chord.melodyScale;
          melodyNoteFreq = notes[Math.floor(Math.random() * notes.length)];
          melodyDuration = sampleRate * (1.0 + Math.random() * 2.0);
          melodyEnv = 1.0;
        } else {
          melodyNoteFreq = 0;
        }
      }
    }
    
    let melodySample = 0;
    if (melodyNoteFreq > 0 && melodyEnv > 0) {
      const melPhase = 2 * Math.PI * melodyNoteFreq * (s / sampleRate);
      if (isDnB) {
        // Electric Piano / Rhodes bell pluck (Sine + warm 3rd harmonic)
        melodySample = (Math.sin(melPhase) + 0.35 * Math.sin(melPhase * 3.0)) * 0.12 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      } else if (isTrance) {
        // Bright lead saw
        const saw = ((melPhase / Math.PI) % 2) - 1;
        melodySample = (saw * 0.4 + Math.sin(melPhase) * 0.6) * 0.09 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      } else {
        // Muted Lofi bell
        melodySample = (Math.sin(melPhase) + 0.2 * Math.sin(melPhase * 2)) * 0.12 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      }
    }
    
    // Stereo Delay mix
    const delayedL = delayBufferL[delayIdxL];
    const delayedR = delayBufferR[delayIdxR];
    
    delayBufferL[delayIdxL] = melodySample + delayedR * delayFeedback;
    delayBufferR[delayIdxR] = melodySample + delayedL * delayFeedback;
    
    delayIdxL = (delayIdxL + 1) % delayTimeL;
    delayIdxR = (delayIdxR + 1) % delayTimeR;
    
    const melOutL = melodySample + delayedL * 0.55;
    const melOutR = melodySample + delayedR * 0.55;
    
    // AMBIANCE
    let ambianceL = 0, ambianceR = 0;
    if (isTrance || isDnB) {
      // Atmospheric white noise sweeps
      const noise = Math.random() * 2 - 1;
      const sweepHz = isDnB ? 0.03 : 0.02;
      const sweepVol = 0.012 * (0.5 + 0.5 * Math.sin(2 * Math.PI * sweepHz * (s / sampleRate)));
      ambianceL = noise * sweepVol * ambianceGain;
      ambianceR = noise * sweepVol * ambianceGain;
    } else {
      // Lofi rain and vinyl crackles
      const whiteNoise = Math.random() * 2.0 - 1.0;
      const rainSweep = 0.04 + 0.02 * Math.sin(2 * Math.PI * 0.04 * (s / sampleRate));
      rainLp = rainLp + (whiteNoise - rainLp) * rainSweep;
      const rainAmbiance = rainLp * 0.055;
      
      if (Math.random() < 0.00035 && crackleAmp === 0) {
        crackleAmp = 0.45 + Math.random() * 0.4;
      }
      let vinylPop = 0;
      if (crackleAmp > 0) {
        vinylPop = (Math.random() * 2.0 - 1.0) * crackleAmp;
        crackleAmp *= 0.95;
        if (crackleAmp < 0.001) crackleAmp = 0;
      }
      const vinylAmbiance = (whiteNoise * 0.015) + (vinylPop * 0.08);
      ambianceL = (rainAmbiance + vinylAmbiance) * ambianceGain;
      ambianceR = (rainAmbiance + vinylAmbiance) * ambianceGain;
    }
    
    // SIDECHAIN COMPRESSION
    let sidechain = 1.0;
    if (isTrance && kickTime >= 0) {
      sidechain = 0.28 + 0.72 * (1.0 - Math.exp(-kickTime * 18));
    } else if (isDnB && kickTime >= 0) {
      // Milder sidechain ducking to preserve Reese bass presence
      sidechain = 0.45 + 0.55 * (1.0 - Math.exp(-kickTime * 22));
    }
    
    // Master Mix
    let mixL = (padSample + melOutL + bassSample) * sidechain + drumSample + ambianceL;
    let mixR = (padSample + melOutR + bassSample) * sidechain + drumSample + ambianceR;
    
    // Lowpass Master filter
    lpL = lpL + (mixL - lpL) * filterAlpha;
    lpR = lpR + (mixR - lpR) * filterAlpha;
    
    // Hard clipping protection
    let outL = Math.max(-1.0, Math.min(1.0, lpL));
    let outR = Math.max(-1.0, Math.min(1.0, lpR));
    
    const sampleIntL = Math.floor(outL * 32767);
    const sampleIntR = Math.floor(outR * 32767);
    
    const offset = s * 4;
    buffer.writeInt16LE(sampleIntL, offset);
    buffer.writeInt16LE(sampleIntR, offset + 2);
  }
  
  // Write output
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
  const duration = isTest ? 15 : 120;
  const outPath = isTest ? path.join(__dirname, 'test_output.wav') : path.join(__dirname, 'output.wav');
  
  generateLofiTrack(outPath, duration, 72, 'cozy');
}

module.exports = { generateLofiTrack };
