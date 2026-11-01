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
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

// Epic Trance Chords (F# Minor) - High-Fidelity Progression
const CHORDS_TRANCE = [
  { root: 92.50, voices: [185.00, 220.00, 277.18, 329.63, 440.00], melodyScale: [185.00, 220.00, 277.18, 329.63, 415.30] }, // F#m7
  { root: 73.42, voices: [146.83, 185.00, 220.00, 277.18, 370.00], melodyScale: [146.83, 185.00, 220.00, 277.18, 329.63] }, // Dmaj7
  { root: 110.00, voices: [220.00, 277.18, 329.63, 415.30, 554.37], melodyScale: [220.00, 277.18, 329.63, 415.30, 493.88] }, // Amajor7
  { root: 82.41, voices: [164.81, 207.65, 246.94, 293.66, 329.63], melodyScale: [164.81, 246.94, 293.66, 329.63, 415.30] }  // E7
];

// Liquid DnB Chords (E Minor)
const CHORDS_DNB = [
  { root: 82.41, voices: [164.81, 196.00, 246.94, 293.66, 369.99], melodyScale: [329.63, 392.00, 493.88, 587.33, 739.99] },
  { root: 65.41, voices: [130.81, 196.00, 246.94, 293.66, 329.63], melodyScale: [261.63, 329.63, 392.00, 493.88, 523.25] },
  { root: 55.00, voices: [220.00, 261.63, 329.63, 392.00, 493.88], melodyScale: [220.00, 261.63, 329.63, 392.00, 440.00] },
  { root: 61.74, voices: [123.47, 174.61, 220.00, 293.66, 369.99], melodyScale: [246.94, 293.66, 369.99, 440.00, 493.88] }
];

// Cozy Lofi Chords
const CHORDS_LOFI = [
  { root: 65.41, voices: [130.81, 155.56, 196.00, 233.08, 293.66], melodyScale: [261.63, 311.13, 392.00, 466.16, 523.25] },
  { root: 103.83, voices: [103.83, 130.81, 155.56, 196.00, 261.63], melodyScale: [207.65, 261.63, 311.13, 392.00, 523.25] },
  { root: 87.31, voices: [87.31, 207.65, 130.81, 155.56, 196.00], melodyScale: [174.61, 207.65, 261.63, 311.13, 392.00] }
];

function generateLofiTrack(outputPath, durationSeconds = 120, bpm = 100, mood = 'cozy', gains = {}) {
  const isTrance = (mood === 'trance');
  const isDnB = (mood === 'liquiddnb');
  
  const parsedBPM = parseFloat(bpm);
  const activeBPM = isNaN(parsedBPM) || parsedBPM <= 0 ? (isDnB ? 168 : (isTrance ? 138 : 100)) : parsedBPM;
  const chords = isDnB ? CHORDS_DNB : (isTrance ? CHORDS_TRANCE : CHORDS_LOFI);
  
  // Custom channel gains from mixer
  const padGain = gains.pad !== undefined ? parseFloat(gains.pad) : 1.0;
  const melodyGain = gains.melody !== undefined ? parseFloat(gains.melody) : 1.0;
  const bassGain = gains.bass !== undefined ? parseFloat(gains.bass) : 1.0;
  const drumGain = gains.drum !== undefined ? parseFloat(gains.drum) : 1.0;
  const ambianceGain = gains.ambiance !== undefined ? parseFloat(gains.ambiance) : 1.0;
  
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  
  const header = createWavHeader(numSamples, sampleRate, numChannels, bitsPerSample);
  
  // Direct file stream to ensure O(1) constant memory usage (prevents OOM on 2-hour compilations)
  const writeStream = fs.createWriteStream(outputPath);
  writeStream.write(header);
  
  const beatLen = (60 / activeBPM) * sampleRate; // Samples per beat
  const barLen = beatLen * 4;                    // Samples per bar
  const totalBars = Math.floor(numSamples / barLen);
  const chordLen = beatLen * 16;                 // 4 bars per chord
  
  // Delay & Spatial return states
  const delayTimeL = Math.floor(beatLen * 0.75);
  const delayTimeR = Math.floor(beatLen * 0.375);
  const delayBufferL = new Float32Array(delayTimeL);
  const delayBufferR = new Float32Array(delayTimeR);
  let delayIdxL = 0;
  let delayIdxR = 0;
  
  // High-Pass and Low-Pass Filters states (Frequency shelf separators)
  // Low-pass states
  let lpL = 0, lpR = 0;
  // High-pass states (blocking sub-bass below 220Hz from mids/pads)
  let padHplL = 0, padHplR = 0;
  let melHplL = 0, melHplR = 0;
  
  // Triggers state
  let kickTime = -1;
  let kickPhase = 0;
  let snareTime = -1;
  let hatTime = -1;
  
  let lastMelodyTrigger = 0;
  let melodyNoteFreq = 0;
  let melodyDuration = 0;
  let melodyEnv = 0;
  
  // Ambiance noise states
  let rainLp = 0;
  let whiteNoiseSweep = 0;
  
  // Sequencer steps
  const subBeatLen = beatLen / 4; // 16th note steps
  let nextStepSample = 0;
  let sequencerStep = 0;
  
  const chunkSize = sampleRate * 10;
  const chunkBuffer = Buffer.alloc(chunkSize * 4);
  
  let processedSamples = 0;
  
  while (processedSamples < numSamples) {
    const activeChunkSize = Math.min(chunkSize, numSamples - processedSamples);
    
    for (let c = 0; c < activeChunkSize; c++) {
      const s = processedSamples + c;
      
      const currentBar = Math.floor(s / barLen);
      const barProgress = (s % barLen) / barLen;
      const progress = s / numSamples;
      
      // 1. MACRO ARRANGEMENT TIMELINE & ENERGY MATRIX (Evolving 8, 16, 32-bar blocks)
      let section = "climax";
      let enableDrums = true;
      let enableHiHats = true;
      let enableMelody = true;
      let enableBass = true;
      
      // Synthesis automations
      let filterCutoffFactor = 1.0; // Filter Cutoff Sweep progress (0.0 to 1.0)
      let pluckAmpDecayFactor = 1.0; // Note Envelope Gate time (0.0 to 1.0)
      let delayWet = 0.35;           // Spatial return mix (0.0 to 1.0)
      
      const introEndBar = Math.floor(totalBars * 0.15);      // Intro: 0-15%
      const buildup1EndBar = Math.floor(totalBars * 0.35);   // Build-up: 15-35%
      const breakdownEndBar = Math.floor(totalBars * 0.55);  // Deep Breakdown: 35-55%
      const buildup2EndBar = Math.floor(totalBars * 0.65);   // Second Build-up: 55-65%
      const dropEndBar = Math.floor(totalBars * 0.90);       // Climax / Drop: 65-90%
      
      if (currentBar < introEndBar) {
        // Phase 1: Intro (0-15% Energy) - Isolated kicks and basic hats. No melody or pads.
        section = "intro";
        enableDrums = true;
        enableHiHats = false;
        enableMelody = false;
        enableBass = false;
        filterCutoffFactor = 0.3;
        delayWet = 0.1;
      } else if (currentBar < buildup1EndBar) {
        // Phase 2: Build-up (15-35% Energy) - Introduce rolling bass, slowly sweeping pad filters open
        section = "buildup";
        enableDrums = true;
        enableHiHats = true;
        enableMelody = false;
        enableBass = true;
        const phaseProgress = (currentBar - introEndBar) / (buildup1EndBar - introEndBar);
        filterCutoffFactor = 0.3 + 0.5 * phaseProgress;
        pluckAmpDecayFactor = 0.3 + 0.7 * phaseProgress;
        delayWet = 0.15 + 0.15 * phaseProgress;
      } else if (currentBar < breakdownEndBar) {
        // Phase 3: Deep Breakdown (0-10% Low-End Energy) - Complete truncation of kick & sub-bass. Evolving lush pads and leads.
        section = "breakdown";
        enableDrums = false; // Mute kick
        enableHiHats = false;
        enableMelody = true;
        enableBass = false;  // Mute sub-bass
        
        const phaseProgress = (currentBar - buildup1EndBar) / (breakdownEndBar - buildup1EndBar);
        filterCutoffFactor = 0.8;
        pluckAmpDecayFactor = 1.0;
        // Elevate spatial wet mix to maximum atmosphere during breakdown
        delayWet = 0.4 + 0.45 * phaseProgress;
      } else if (currentBar < buildup2EndBar) {
        // Phase 4: Build-up 2 (Tension Build) - Re-introduce rolling bass, build tension with white noise risers
        section = "buildup2";
        enableDrums = true;
        enableHiHats = false;
        enableMelody = true;
        enableBass = true;
        const phaseProgress = (currentBar - breakdownEndBar) / (buildup2EndBar - breakdownEndBar);
        filterCutoffFactor = 0.5 + 0.4 * phaseProgress;
        pluckAmpDecayFactor = 0.5;
        // Snap delay wetness down just before the drop hits
        delayWet = 0.6 * (1.0 - phaseProgress);
      } else if (currentBar < dropEndBar) {
        // Phase 5: Climax / Drop (100% Energy) - Converge all elements simultaneously
        section = "climax";
        enableDrums = true;
        enableHiHats = true;
        enableMelody = true;
        enableBass = true;
        filterCutoffFactor = 1.15; // Fully bright, raspy filter
        pluckAmpDecayFactor = 1.0;
        delayWet = 0.38; // Tight spatial delay for rhythm clarity
      } else {
        // Phase 6: Outro - Strip down melody and drums, leaving only ambiance and soft pads
        section = "outro";
        enableDrums = false;
        enableHiHats = false;
        enableMelody = false;
        enableBass = false;
        const phaseProgress = (currentBar - dropEndBar) / (totalBars - dropEndBar);
        filterCutoffFactor = 0.8 * (1.0 - phaseProgress);
        delayWet = 0.3 * (1.0 - phaseProgress);
      }
      
      // 2. MODULATING TRANSFORMATION KEY SCHEDULER (Transposes scales every 4 loops)
      const cycleIndex = Math.floor(s / (chordLen * 4));
      const transposeIntervals = [0, 5, 3, 7, 2, 0];
      const semitones = transposeIntervals[cycleIndex % transposeIntervals.length];
      const transposeFactor = Math.pow(2.0, semitones / 12.0);
      
      const chordIndex = Math.floor(s / chordLen) % chords.length;
      const baseChord = chords[chordIndex];
      
      const chordRoot = baseChord.root * transposeFactor;
      const chordVoices = baseChord.voices.map(v => v * transposeFactor);
      const chordMelodyScale = baseChord.melodyScale.map(m => m * transposeFactor);
      
      // Smooth crossfade envelope between chord transitions
      const chordAge = s % chordLen;
      const attackLen = sampleRate * 1.0;
      const releaseLen = sampleRate * 1.0;
      let chordVolume = 1.0;
      if (chordAge < attackLen) {
        chordVolume = chordAge / attackLen;
      } else if (chordAge > chordLen - releaseLen) {
        chordVolume = (chordLen - chordAge) / releaseLen;
      }
      
      // Step sequencer tick
      let triggerStep = false;
      if (s >= Math.floor(nextStepSample)) {
        triggerStep = true;
        nextStepSample += subBeatLen;
        sequencerStep = (sequencerStep + 1) % 16;
      }
      
      // 3. THE DRIFTING "ROLLING" BASSLINE & SIDECHAIN RELATIONSHIP
      // Kick transient triggers:
      // In Trance/Synth, kick drums fire on steps 0, 4, 8, 12 (beat boundaries)
      if (triggerStep && enableDrums) {
        if (sequencerStep === 0 || sequencerStep === 4 || sequencerStep === 8 || sequencerStep === 12) {
          kickTime = 0;
          kickPhase = 0;
        }
        
        // Snare / Pluck triggers
        if (sequencerStep === 4 || sequencerStep === 12) {
          snareTime = 0;
        }
        if (sequencerStep % 2 === 1) {
          hatTime = 0;
        }
      }
      
      // SUB-BASS SHELF (40Hz - 80Hz): Sub-kick weight synthesis
      let subKickSample = 0;
      if (kickTime >= 0 && enableDrums) {
        // Rapid pitch sweep sine kick (starts at 160Hz and sweeps down to 48Hz)
        const sweepSpeed = 85;
        const f = 45 + 115 * Math.exp(-kickTime * sweepSpeed);
        kickPhase += 2 * Math.PI * f / sampleRate;
        // Fast amplitude decay curve
        subKickSample = Math.sin(kickPhase) * Math.exp(-kickTime * 14.5) * 0.45;
        kickTime += 1 / sampleRate;
        if (kickTime > 0.32) kickTime = -1;
      }
      
      // Sidechain Ducking parameter based on kick envelope:
      // Duck volume amplitude of pads, leads, and rolling bass to ZERO during kick transient
      let sidechainDuck = 1.0;
      if (kickTime >= 0 && enableDrums) {
        sidechainDuck = 0.0 + 1.0 * (1.0 - Math.exp(-kickTime * 24.0)); // Ducks to 0 and recovers
      }
      
      // ROLLING BASSLINE: Hitting on the off-beat 16th-note steps *between* the kicks
      let rollingBassSample = 0;
      if (enableBass) {
        // In a 4/4 grid, kick hits step 0. Rolling bass fills steps 1, 2, 3 of every beat.
        const stepInBeat = sequencerStep % 4;
        const isOffBeat = (stepInBeat === 1 || stepInBeat === 2 || stepInBeat === 3);
        
        if (isOffBeat) {
          const bassPhase = 2 * Math.PI * chordRoot * (s / sampleRate);
          // Upper harmonic bite: Saturated sawtooth wave
          const rawSaw = ((bassPhase / Math.PI) % 2) - 1;
          
          // Fast decay low-pass envelope
          const stepAge = (s % subBeatLen);
          const bassDecay = Math.exp(-stepAge / (subBeatLen * 0.8));
          
          // Sidechain is applied strictly here to prevent low-end collision
          rollingBassSample = rawSaw * bassDecay * 0.28 * chordVolume * sidechainDuck * bassGain;
        }
      }
      
      // MID-RANGE & LOW-MIDS SHELF (250Hz - 2.5kHz): Lush Detuned Pads
      let padRaw = 0;
      for (let i = 0; i < chordVoices.length; i++) {
        const freq = chordVoices[i];
        // detuned voice oscillators
        const phase1 = 2 * Math.PI * (freq * 0.997) * (s / sampleRate);
        const phase2 = 2 * Math.PI * (freq * 1.003) * (s / sampleRate);
        const osc1 = ((phase1 / Math.PI) % 2) - 1;
        const osc2 = Math.sin(phase2);
        padRaw += (osc1 * 0.5 + osc2 * 0.5);
      }
      padRaw = (padRaw / chordVoices.length) * 0.26 * chordVolume * padGain;
      
      // Separate Pad frequencies (High-pass shelf at 200Hz to prevent low-end mud)
      const padHpAlpha = 0.025; // Filters out frequencies below 200Hz
      padHplL = padHplL + (padRaw - padHplL) * padHpAlpha;
      let padFiltered = padRaw - padHplL;
      
      // MID-RANGE SHELF: Evolving Lead Melody / Arpeggios
      const melodyInterval = beatLen / 2; // 8th note arpeggios
      if (s - lastMelodyTrigger > melodyInterval) {
        lastMelodyTrigger = s;
        if (enableMelody) {
          const notes = chordMelodyScale;
          const beatIndex = Math.floor(s / melodyInterval) % 16;
          
          // Evolving step sequences based on bar progressions
          const pattern = [0, 2, 4, 3, 7, 5, 4, 2, 3, 5, 7, 6, 9, 7, 5, 4];
          const noteIndex = pattern[(beatIndex + currentBar) % pattern.length];
          
          melodyNoteFreq = notes[noteIndex % notes.length];
          melodyDuration = melodyInterval * (0.8 + 1.5 * pluckAmpDecayFactor); // Evolving envelope gate length
          melodyEnv = 1.0;
        } else {
          melodyNoteFreq = 0;
        }
      }
      
      let melodyRaw = 0;
      if (melodyNoteFreq > 0 && melodyEnv > 0) {
        const melPhase = 2 * Math.PI * melodyNoteFreq * (s / sampleRate);
        // Bright sawtooth detuned arpeggio
        const saw1 = ((melPhase / Math.PI) % 2) - 1;
        const saw2 = (((melPhase * 1.005) / Math.PI) % 2) - 1;
        
        melodyRaw = (saw1 * 0.5 + saw2 * 0.5) * 0.12 * melodyEnv * melodyGain;
        melodyEnv -= 1.0 / melodyDuration;
      }
      
      // High-pass filter melody at 250Hz (No low-end mud)
      const melHpAlpha = 0.032;
      melHplL = melHplL + (melodyRaw - melHplL) * melHpAlpha;
      let melodyFiltered = melodyRaw - melHplL;
      
      // SPATIAL RETURNS: Delay line feedback with dynamic wet automation
      const delayedL = delayBufferL[delayIdxL];
      const delayedR = delayBufferR[delayIdxR];
      
      const delayFeedback = 0.55 + 0.25 * (delayWet > 0.4 ? (delayWet - 0.4) / 0.45 : 0);
      delayBufferL[delayIdxL] = melodyFiltered + delayedR * delayFeedback;
      delayBufferR[delayIdxR] = melodyFiltered + delayedL * delayFeedback;
      
      delayIdxL = (delayIdxL + 1) % delayTimeL;
      delayIdxR = (delayIdxR + 1) % delayTimeR;
      
      // Mix delay return wetness dynamically
      const melOutL = (1.0 - delayWet) * melodyFiltered + delayWet * delayedL;
      const melOutR = (1.0 - delayWet) * melodyFiltered + delayWet * delayedR;
      
      // HIGH FREQUENCIES SHELF (2.5kHz - 20kHz): Hats, Snares, and White Noise
      let highHatSample = 0;
      let whiteNoiseSample = 0;
      
      if (enableHiHats && hatTime >= 0) {
        // High-pass filtered white noise for hi-hats
        const noise = Math.random() * 2 - 1;
        highHatSample = noise * Math.exp(-hatTime * 155) * 0.08 * drumGain;
        hatTime += 1 / sampleRate;
        if (hatTime > 0.06) hatTime = -1;
      }
      
      // Snare drum snap
      let snareSample = 0;
      if (snareTime >= 0 && enableDrums) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-snareTime * 35) * 0.18;
        const snap = Math.sin(2 * Math.PI * 180 * snareTime) * Math.exp(-snareTime * 70) * 0.08;
        snareSample = (noise + snap) * drumGain;
        snareTime += 1 / sampleRate;
        if (snareTime > 0.22) snareTime = -1;
      }
      
      // White noise risers / sweeps build tension up to drop
      if (section === "buildup2") {
        const noiseVal = Math.random() * 2 - 1;
        // Automate noise volume sweep open
        const sweepVol = 0.045 * barProgress;
        whiteNoiseSample = noiseVal * sweepVol * ambianceGain;
      }
      
      // Master Summing Bus
      // Sidechain compression ducks mid-range (pads + leads) and rolling bass during kick hits
      const masterMidsL = (padFiltered + melOutL + rollingBassSample) * sidechainDuck;
      const masterMidsR = (padFiltered + melOutR + rollingBassSample) * sidechainDuck;
      
      // Sum other shelves
      let mixL = masterMidsL + subKickSample + snareSample + highHatSample + whiteNoiseSample;
      let mixR = masterMidsR + subKickSample + snareSample + highHatSample + whiteNoiseSample;
      
      // Automated master low-pass filter
      const activeFilterAlpha = 0.08 + 0.38 * filterCutoffFactor;
      lpL = lpL + (mixL - lpL) * activeFilterAlpha;
      lpR = lpR + (mixR - lpR) * activeFilterAlpha;
      
      const outL = Math.max(-1.0, Math.min(1.0, lpL));
      const outR = Math.max(-1.0, Math.min(1.0, lpR));
      
      const sampleIntL = Math.floor(outL * 32767);
      const sampleIntR = Math.floor(outR * 32767);
      
      const offset = c * 4;
      chunkBuffer.writeInt16LE(sampleIntL, offset);
      chunkBuffer.writeInt16LE(sampleIntR, offset + 2);
    }
    
    // Write processed block to direct disk stream
    writeStream.write(chunkBuffer.slice(0, activeChunkSize * 4));
    processedSamples += activeChunkSize;
  }
  
  writeStream.end();
  console.log(`Synthesis complete! High-Fidelity loop generated at ${outputPath}`);
}

// CLI Tester
if (require.main === module) {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const duration = isTest ? 15 : 120;
  const outPath = isTest ? path.join(__dirname, 'test_output.wav') : path.join(__dirname, 'output.wav');
  
  generateLofiTrack(outPath, duration, 138, 'trance');
}

module.exports = { generateLofiTrack };
